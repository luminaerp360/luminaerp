import { Component, OnInit } from '@angular/core';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { AddCustomerComponent } from '../add-customer/add-customer.component';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { Customer } from '../../../../shared/interfaces/customer.interface';

@Component({
  selector: 'app-show-customer',
  templateUrl: './show-customer.component.html',
  styleUrl: './show-customer.component.scss',
})
export class ShowCustomerComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddCustomerComponent
  );
  customers: Customer[] = [];
  loading = true;
  selectedCustomers: Set<number> = new Set();
  allSelected = false;
  searchTerm = '';
  showDeleteConfirm = false;
  customerToDelete: Customer | null = null;
  showBulkDeleteConfirm = false;
  isDeleting = false;

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.getAllCustomers();
  }

  getAllCustomers() {
    this.loading = true;
    this.customerService.getAllCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching customers:', error);
        this.loading = false;
      },
    });
  }

  get filteredCustomers(): Customer[] {
    if (!this.searchTerm) return this.customers;
    return this.customers.filter(
      (customer) =>
        customer.fullName
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(this.searchTerm)
    );
  }

  get selectedCustomersCount(): number {
    return this.selectedCustomers.size;
  }

  get hasSelectedCustomers(): boolean {
    return this.selectedCustomers.size > 0;
  }

  toggleAllCustomers() {
    this.allSelected = !this.allSelected;
    if (this.allSelected) {
      this.filteredCustomers.forEach((_, index) =>
        this.selectedCustomers.add(index)
      );
    } else {
      this.selectedCustomers.clear();
    }
  }

  toggleCustomer(index: number) {
    if (this.selectedCustomers.has(index)) {
      this.selectedCustomers.delete(index);
      this.allSelected = false;
    } else {
      this.selectedCustomers.add(index);
      if (this.selectedCustomers.size === this.filteredCustomers.length) {
        this.allSelected = true;
      }
    }
  }

  openDialog(optionalPayload?: any) {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog(optionalPayload).subscribe((resp) => {
      console.log('Response from dialog content:', resp);
      this.getAllCustomers();
    });
  }

  openUpdateDialog(customer: Customer) {
    this.openDialog(customer);
  }

  confirmDelete(customer: Customer) {
    this.customerToDelete = customer;
    this.showDeleteConfirm = true;
  }

  confirmBulkDelete() {
    if (this.hasSelectedCustomers) {
      this.showBulkDeleteConfirm = true;
    }
  }

  async deleteCustomer() {
    if (!this.customerToDelete) return;

    this.isDeleting = true;
    try {
      await this.customerService
        .deleteCustomer(this.customerToDelete.id!)
        .toPromise();
      this.getAllCustomers();
      this.showDeleteConfirm = false;
      this.customerToDelete = null;
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      this.isDeleting = false;
    }
  }

  async bulkDeleteCustomers() {
    if (!this.hasSelectedCustomers) return;

    this.isDeleting = true;
    try {
      const selectedCustomerIds = Array.from(this.selectedCustomers).map(
        (index) => this.filteredCustomers[index].id
      );

      await Promise.all(
        selectedCustomerIds.map((id) =>
          this.customerService.deleteCustomer(id!).toPromise()
        )
      );

      this.selectedCustomers.clear();
      this.allSelected = false;
      this.getAllCustomers();
      this.showBulkDeleteConfirm = false;
    } catch (error) {
      console.error('Error deleting customers:', error);
    } finally {
      this.isDeleting = false;
    }
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.showBulkDeleteConfirm = false;
    this.customerToDelete = null;
  }

  closeDialog() {
    this.dialog.closeDialog();
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
      : 'bg-red-900/50 text-red-300 border border-red-700';
  }

  clearSearch() {
    this.searchTerm = '';
  }

  clearSelection() {
    this.selectedCustomers.clear();
    this.allSelected = false;
  }
}
