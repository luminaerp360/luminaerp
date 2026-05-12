import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import { AuthService } from '../../../../shared/Services/auth.service';
import { ProductService } from '../../../../shared/Services/product.service';
import {
  UserProductCommission,
  CommissionType,
  CreateUserProductCommissionDto,
} from '../../../../shared/interfaces/commission.interface';
import { Product } from '../../../../shared/interfaces/products';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';

@Component({
  selector: 'app-user-commission-rates',
  templateUrl: './user-commission-rates.component.html',
  styleUrls: ['./user-commission-rates.component.scss'],
})
export class UserCommissionRatesComponent implements OnInit {
  organizationId!: number;
  users: UserInterface[] = [];
  products: Product[] = [];
  userCommissions: UserProductCommission[] = [];
  selectedUser: UserInterface | null = null;

  loading = false;
  savingRate = false;
  showAddForm = false;

  rateForm: FormGroup;

  CommissionType = CommissionType;

  constructor(
    private fb: FormBuilder,
    private commissionService: CommissionService,
    private authService: AuthService,
    private productService: ProductService,
  ) {
    this.rateForm = this.fb.group({
      productId: ['', Validators.required],
      commissionType: [CommissionType.PERCENTAGE, Validators.required],
      commissionValue: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    this.loadUsers();
    this.loadProducts();
  }

  loadUsers() {
    this.authService.getAllUsers().subscribe({
      next: (users: UserInterface[]) => {
        this.users = users;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
      },
    });
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products.filter((p: Product) => p.isCommissionable);
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
    });
  }

  onUserSelected(event: Event) {
    const select = event.target as HTMLSelectElement;
    const userId = select.value ? +select.value : null;

    if (userId) {
      this.selectedUser = this.users.find((u) => u.id === userId) || null;
      this.showAddForm = false;
      this.loadUserCommissions(userId);
    } else {
      this.selectedUser = null;
      this.userCommissions = [];
    }
  }

  loadUserCommissions(userId: number) {
    this.loading = true;
    this.commissionService
      .getUserProductCommissions(userId, this.organizationId)
      .subscribe({
        next: (commissions) => {
          this.userCommissions = commissions;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading user commissions:', error);
          this.loading = false;
        },
      });
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.rateForm.reset({
        productId: '',
        commissionType: CommissionType.PERCENTAGE,
        commissionValue: 0,
      });
    }
  }

  saveRate() {
    if (this.rateForm.valid && this.selectedUser) {
      this.savingRate = true;
      const dto: CreateUserProductCommissionDto = {
        userId: this.selectedUser.id,
        productId: parseInt(this.rateForm.value.productId),
        commissionType: this.rateForm.value.commissionType,
        commissionValue: parseFloat(this.rateForm.value.commissionValue),
      };

      this.commissionService
        .setUserProductCommission(dto, this.organizationId)
        .subscribe({
          next: () => {
            this.savingRate = false;
            this.showAddForm = false;
            if (this.selectedUser?.id) {
              this.loadUserCommissions(this.selectedUser.id);
            }
          },
          error: (error) => {
            console.error('Error saving commission rate:', error);
            this.savingRate = false;
          },
        });
    }
  }

  deleteRate(commission: UserProductCommission) {
    if (
      confirm(
        'Are you sure you want to remove this custom rate? The product will use its default rate.',
      )
    ) {
      this.commissionService
        .deleteUserProductCommission(commission.userId, commission.productId)
        .subscribe({
          next: () => {
            if (this.selectedUser?.id) {
              this.loadUserCommissions(this.selectedUser.id);
            }
          },
          error: (error) => {
            console.error('Error deleting commission rate:', error);
          },
        });
    }
  }

  getProductName(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    return product?.name || 'Unknown Product';
  }

  getProductDefaultRate(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return 'N/A';

    if (product.defaultCommissionType === 'PERCENTAGE') {
      return `${product.defaultCommissionValue}%`;
    } else {
      return `Ksh ${product.defaultCommissionValue}/unit`;
    }
  }

  formatCommissionValue(commission: UserProductCommission): string {
    if (commission.commissionType === CommissionType.PERCENTAGE) {
      return `${commission.commissionValue}%`;
    } else {
      return `Ksh ${commission.commissionValue}/unit`;
    }
  }

  getAvailableProducts(): Product[] {
    const assignedProductIds = this.userCommissions.map((c) => c.productId);
    return this.products.filter((p) => !assignedProductIds.includes(p.id));
  }
}
