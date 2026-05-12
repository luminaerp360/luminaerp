import { Component, OnInit } from '@angular/core';
import {
  StoreProduct,
  StockSummary,
} from '../../../../../shared/interfaces/store.interface';
import { StoreProductService } from '../../../../../shared/Services/store-product.service';
import { AddStoreProductComponent } from '../add-store-product/add-store-product.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-store-products',
  templateUrl: './show-store-products.component.html',
  styleUrl: './show-store-products.component.scss',
})
export class ShowStoreProductsComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddStoreProductComponent,
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddStoreProductComponent,
  );
  storeProducts: StoreProduct[] = [];
  query: string = '';
  loading: boolean = false;
  summary: StockSummary | null = null;
  showLowStockOnly: boolean = false;

  constructor(
    private storeProductService: StoreProductService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.getAllStoreProducts();
    this.loadSummary();
  }

  onInputChange() {
    this.getAllStoreProducts();
  }

  loadSummary(): void {
    this.storeProductService.getStockSummary().subscribe(
      (summary) => (this.summary = summary),
      () => {},
    );
  }

  getAllStoreProducts(): void {
    this.loading = true;
    const params: any = {};
    if (this.query && this.query.trim()) params.search = this.query.trim();
    if (this.showLowStockOnly) params.lowStock = true;
    this.storeProductService
      .getAllStoreProducts(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((products) => {
        this.storeProducts = products;
      });
  }

  toggleLowStock(): void {
    this.showLowStockOnly = !this.showLowStockOnly;
    this.getAllStoreProducts();
  }

  getStockStatus(product: StoreProduct): { label: string; class: string } {
    if (product.quantity === 0)
      return {
        label: 'Out of Stock',
        class: 'text-red-500 bg-red-100 dark:bg-red-900/30',
      };
    if (product.reorderLevel > 0 && product.quantity <= product.reorderLevel)
      return {
        label: 'Low Stock',
        class: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
      };
    return {
      label: 'In Stock',
      class: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    };
  }

  deleteStoreProduct(id: number): void {
    if (confirm('Are you sure you want to delete this store product?')) {
      this.loading = true;
      this.storeProductService
        .deleteStoreProduct(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Store product deleted successfully');
          this.getAllStoreProducts();
          this.loadSummary();
        });
    }
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog().subscribe((resp) => {
      if (resp) {
        this.getAllStoreProducts();
        this.loadSummary();
      }
    });
  }

  openUpdateDialog(product: StoreProduct) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog(product).subscribe((resp) => {
      if (resp) {
        this.getAllStoreProducts();
        this.loadSummary();
      }
    });
  }
}
