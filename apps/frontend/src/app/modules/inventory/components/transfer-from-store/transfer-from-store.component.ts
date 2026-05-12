import { Component } from '@angular/core';
import { ProductService } from '../../../../shared/Services/product.service';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { Product } from '../../../../shared/interfaces/products';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService } from '../../../../shared/Services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-transfer-from-store',
  templateUrl: './transfer-from-store.component.html',
  styleUrl: './transfer-from-store.component.scss',
})
export class TransferFromStoreComponent {
  products: Product[] = [];
  selectedProducts: Product[] = [];
  filteredProducts: Product[] = [];
  surpliers: any = [];
  selectedShiftId: number | null = null;
  currentUser: UserInterface | null = null;
  query: string = '';
  orgOptions: any;
  supplierName: string = '';
  loading: boolean = true;
  posting: boolean = false;


  constructor(
    private productsService: ProductService,
    private inventoryService: InventoryService,
    private toast: HotToastService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.getOrgOptions();
    this.getAllProducts();
    // this.getCurentUser();
  }
  getOrgOptions() {
    const orgOptionsString = localStorage.getItem('orgOptions');
    if (orgOptionsString) {
      this.orgOptions = JSON.parse(orgOptionsString);
      // console.log('Organization options found in local storage',this.orgOptions);
    } else {
      console.log('Organization options not found in local storage');
    }
  }

  ngOnDestroy(): void {
    // this.unsubscribeFromCategoriesChanges();
  }

  // subscribeToCurrentShift() {
  //   this.shiftService.currentShift$.subscribe((shift) => {
  //     this.selectedShiftId = shift?.id ?? null; // Update the selectedShiftId when currentShift changes
  //   });
  // }
  // getCurentUser() {
  //   this.authService.getCurrentUser().subscribe((user) => {
  //     if (!user) {
  //       console.log('no user');
  //     }
  //     this.currentUser = user;
  //     console.log('current user', this.currentUser);
  //   });
  // }

  getAllProducts() {
    this.productsService.getAllProducts().subscribe((data: any) => {
      if (this.query) {
        this.products = data.filter((product: any) =>
          product.name.toLowerCase().includes(this.query.toLowerCase())
        );
        this.loading = false;
      } else {
        this.products = data.filter((product: any) => !product.is_service);
        this.loading = false;
      }
    });
  }

 

 

  onProductClick(product: Product): void {
    if (!this.selectedProducts.some((p) => p.id === product.id)) {
      this.selectedProducts.push(product);
      this.query = '';
      console.log('Selected Products:', this.selectedProducts);
    }
  }

  removeSelectedProduct(index: number): void {
    if (index >= 0 && index < this.selectedProducts.length) {
      this.selectedProducts.splice(index, 1);
    } else {
      console.error('Invalid index for removing selected product');
    }
  }

  transferStock(): void {
    // Validate selected products
    if (this.selectedProducts.length === 0) {
      this.toast.error('Please select at least one product.');
      return;
    }

    // Validate each selected product
    for (const product of this.selectedProducts) {
      if (!product.pax) {
        this.toast.error(
          'Please fill in all fields for the stock Quantity To transfer for all Selected Products.'
        );
        return;
      }
      if (product.storeQuantity! - product.pax < 0) {
        this.toast.error(
          'Not Enough Quantity To Transfer for' + product.name
        );
        return;
      }
    }

    // Create an array to store observables
    const observables = [];
    this.posting = true;

    // Create an observable for each product transfer
    for (const product of this.selectedProducts) {
      const purchaseData = {
        item: product.name,
        quantity: product.pax,
        shift_id: this.selectedShiftId,
        moved_by: this.currentUser!.username,
      };
      observables.push(this.inventoryService.createStockTransfer(purchaseData));
    }

    // Combine all observables and wait for all of them to complete
    forkJoin(observables).subscribe(
      (responses) => {
        console.log('All purchases added:', responses);
        this.toast.success('Stock Transferred successfully');
        this.addProductsAddedQuantityToStore();
        this.posting = false;
      },
      (error) => {
        console.error('Error adding purchases:', error);
        this.toast.error(
          'Error adding purchases check your Internet Connection'
        );
        this.posting = false;
      }
    );
  }

  addProductsAddedQuantityToStore(): void {
    this.selectedProducts.forEach((product) => {
      const purchaseData = {
        name: product.name + product.pax!,
        storeQuantity: product.storeQuantity! - product.pax!,
      };
      console.log('quantity to update', purchaseData);
      this.productsService.updateProduct(product.id, purchaseData).subscribe(
        (response) => {
          // console.log('quantity   added:', response);
          // this.toast.success('quantity  added successfully');
          this.clearFilters();
        },
        (error) => {
          console.error('Error adding purchase:', error);
        }
      );
    });
  }
  clearFilters(): void {
    this.query = '';
    this.supplierName = '';
    this.selectedProducts = [];
  }
}
