import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-show-suplliers',
  templateUrl: './show-suplliers.component.html',
  styleUrl: './show-suplliers.component.scss',
})
export class ShowSuplliersComponent implements OnInit {
  suppliers: Supplier[] = [];
  query: string = '';
  isModalVisible: boolean = false;
  isEditModalVisible: boolean = false;
  supllierIdToEdit: string = '';
  isLoading: boolean = false;
  isSearching: boolean = false;
  selectedSuppliers: Set<string> = new Set();
  @Output() editStudent = new EventEmitter<string>();

  constructor(private suppliersService: SuppliersService) {}

  ngOnInit(): void {
    this.getAllSupplier();
  }

  toggleModal() {
    this.isModalVisible = !this.isModalVisible;
    if (!this.isModalVisible) {
      this.getAllSupplier();
    }
  }

  toggleEditModal(id: any) {
    this.supllierIdToEdit = id;
    this.isEditModalVisible = !this.isEditModalVisible;
    if (id !== null) {
      this.editStudent.emit(id);
    }
    if (!this.isEditModalVisible) {
      this.getAllSupplier();
    }
  }

  getAllSupplier(searchQuery?: string) {
    if (searchQuery) {
      this.isSearching = true;
    } else {
      this.isLoading = true;
    }

    this.suppliersService
      .getAllSupplier()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isSearching = false;
        })
      )
      .subscribe({
        next: (data: Supplier[]) => {
          if (searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            this.suppliers = data.filter(
              (supplier) =>
                supplier.name.toLowerCase().includes(query) ||
                supplier.phone.toLowerCase().includes(query)
            );
          } else {
            this.suppliers = data;
          }
        },
        error: (error: any) => {
          console.error('Error fetching suppliers:', error);
        },
      });
  }

  onInputChange(): void {
    this.getAllSupplier(this.query);
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.suppliers.forEach((supplier) =>
        this.selectedSuppliers.add(supplier.id.toString())
      );
    } else {
      this.selectedSuppliers.clear();
    }
  }

  toggleSelectSupplier(supplierId: string): void {
    if (this.selectedSuppliers.has(supplierId)) {
      this.selectedSuppliers.delete(supplierId);
    } else {
      this.selectedSuppliers.add(supplierId);
    }
  }

  isSelected(supplierId: string): boolean {
    return this.selectedSuppliers.has(supplierId);
  }

  printSelected(): void {
    // Implement print functionality
    console.log(
      'Printing selected suppliers:',
      Array.from(this.selectedSuppliers)
    );
  }
}
