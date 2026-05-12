import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Product } from '../../../../../shared/interfaces/products';
import {
  ProductService,
  ProductValueResponse,
  CategoryValueResponse,
  LowStockResponse,
  ProductUnit,
  UnitHistoryResponse,
  UnitTimelineEvent,
} from '../../../../../shared/Services/product.service';
import { ProductsUploadComponent } from '../products-upload/products-upload.component';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { AddProductsComponent } from '../add-products/add-products.component';
import { PermissionService } from '../../../../../shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-products',
  templateUrl: './show-products.component.html',
  styleUrl: './show-products.component.scss',
})
export class ShowProductsComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    ProductsUploadComponent,
  );
  private addProductdialog: DialogRemoteControl = new DialogRemoteControl(
    AddProductsComponent,
  );
  private updateProductdialog: DialogRemoteControl = new DialogRemoteControl(
    AddProductsComponent,
  );

  // Existing properties
  products: Product[] = [];
  filteredProducts: Product[] = []; // For displaying filtered results
  query: string = '';
  isModalVisible: boolean = false;
  loading: boolean = false;
  isEditModalVisible: boolean = false;
  productIdToEdit: number | null = null;
  @Output() editStudent = new EventEmitter<number>();

  // NEW ANALYTICS PROPERTIES
  showAnalytics: boolean = false;
  analyticsLoading: boolean = false;
  productValue: ProductValueResponse | null = null;
  categoryValues: CategoryValueResponse[] = [];
  lowStockData: LowStockResponse | null = null;
  activeAnalyticsTab: 'overview' | 'categories' | 'lowstock' = 'overview';

  // Permission flags
  canUpdateProduct: boolean = false;
  canDeleteProduct: boolean = false;
  hasModuleAccess: boolean = false;

  // MODERN FEATURES
  viewMode: 'list' | 'grid' = 'list'; // View toggle
  selectedStatus: string = 'all'; // Status filter
  productStatuses = ['all', 'ACTIVE', 'DRAFT', 'DISCONTINUED', 'OUT_OF_STOCK'];
  selectedProducts: Set<number> = new Set(); // Bulk selection
  selectAll: boolean = false;

  // Tracked units modal
  showUnitsModal: boolean = false;
  selectedUnitProduct: Product | null = null;
  productUnits: ProductUnit[] = [];
  unitLoading: boolean = false;
  unitSearchQuery: string = '';
  unitStatusFilter: 'ALL' | 'IN_STOCK' | 'RESERVED' | 'SOLD' = 'ALL';

  // Pagination
  unitPage: number = 1;
  unitLimit: number = 20;
  unitTotal: number = 0;
  unitTotalPages: number = 0;

  // Date range filter
  unitDateFrom: string = '';
  unitDateTo: string = '';

  // Unit history
  selectedUnit: ProductUnit | null = null;
  unitHistory: UnitTimelineEvent[] = [];
  historyLoading: boolean = false;
  showHistoryPanel: boolean = false;

  // Search debounce
  private unitSearchTimeout: any = null;

  constructor(
    private productService: ProductService,
    private permissionService: PermissionService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    // Load permissions first
    this.loadPermissions();

    // If user lacks module access, block access (consistent with other modules)
    if (!this.hasModuleAccess) {
      this.toast.error("You don't have access to the products module");
      return;
    }
    this.getAllProducts(); // Initially load all products
    this.loadAnalytics(); // Load analytics data
  }

  /**
   * Load permission flags for products
   */
  private loadPermissions(): void {
    this.hasModuleAccess = this.permissionService.hasModuleAccess('products');
    this.canUpdateProduct = this.permissionService.canPerformAction(
      'products',
      'update',
    );
    this.canDeleteProduct = this.permissionService.canPerformAction(
      'products',
      'delete',
    );

    console.log('=== Products Permissions Debug ===');
    console.log('Has Module Access (products):', this.hasModuleAccess);
    console.log('Can Update Product:', this.canUpdateProduct);
    console.log('Can Delete Product:', this.canDeleteProduct);
    console.log('All Permissions:', this.permissionService.getPermissions());
  }

  // NEW ANALYTICS METHODS
  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics && !this.productValue) {
      this.loadAnalytics();
    }
  }

  setActiveAnalyticsTab(tab: 'overview' | 'categories' | 'lowstock'): void {
    this.activeAnalyticsTab = tab;
  }

  loadAnalytics(): void {
    this.analyticsLoading = true;

    // Load all analytics data
    this.productService.getProductsValue().subscribe({
      next: (data) => {
        this.productValue = data;
      },
      error: (error) => {
        console.error('Error loading product value analytics:', error);
      },
    });

    this.productService.getProductsValueByCategory().subscribe({
      next: (data) => {
        this.categoryValues = data;
      },
      error: (error) => {
        console.error('Error loading category analytics:', error);
      },
    });

    this.productService.getLowStockProducts().subscribe({
      next: (data) => {
        this.lowStockData = data;
        this.analyticsLoading = false;
      },
      error: (error) => {
        console.error('Error loading low stock analytics:', error);
        this.analyticsLoading = false;
      },
    });
  }

  refreshAnalytics(): void {
    this.loadAnalytics();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // EXISTING METHODS (unchanged)
  toggleModal() {
    this.isModalVisible = !this.isModalVisible;
  }

  toggleEditModal(id: number) {
    this.productIdToEdit = id;
    this.isEditModalVisible = !this.isEditModalVisible;
    if (id !== null) {
      this.editStudent.emit(id); // Emit event with student ID
    }
    this.getAllProducts(); // Refresh products after editing
    this.loadAnalytics(); // Refresh analytics after editing
  }

  calculateStockPercentage(product: Product): number {
    if (!product.quantity || !product.reorderLevel) {
      return product.quantity ? 100 : 0;
    }

    // Calculate percentage based on reorder level (max = 200%)
    const targetLevel = product.reorderLevel * 2;
    const percentage = (product.quantity / targetLevel) * 100;

    // Cap at 100%
    return Math.min(percentage, 100);
  }

  getAllProducts(searchQuery?: string): void {
    this.loading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilters(searchQuery);
        console.log('Filtered products', this.filteredProducts);
      },
      error: (error) => {
        console.error('Error loading products', error);
        // Add user-friendly error handling here
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  // Apply all filters (search + status)
  applyFilters(searchQuery?: string): void {
    let filtered = [...this.products];

    // Apply search filter
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.productIdNumber?.toLowerCase().includes(query) ||
          (product as any).sku?.toLowerCase().includes(query) ||
          product.category?.name?.toLowerCase().includes(query) ||
          (product as any).tags?.some((tag: string) =>
            tag.toLowerCase().includes(query),
          ),
      );
    }

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(
        (product) => (product as any).status === this.selectedStatus,
      );
    }

    this.filteredProducts = filtered;
  }

  onInputChange(): void {
    console.log('Query changed', this.query);
    this.applyFilters(this.query);
  }

  // Status filter changed
  onStatusFilterChange(): void {
    this.applyFilters(this.query);
  }

  // View mode toggle
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  // Bulk selection methods
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.filteredProducts.forEach((p) => this.selectedProducts.add(p.id));
    } else {
      this.selectedProducts.clear();
    }
  }

  toggleProductSelection(productId: number): void {
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
    } else {
      this.selectedProducts.add(productId);
    }
    this.selectAll =
      this.selectedProducts.size === this.filteredProducts.length;
  }

  isProductSelected(productId: number): boolean {
    return this.selectedProducts.has(productId);
  }

  deleteSelectedProducts(): void {
    if (!this.canDeleteProduct) {
      this.toast.error("You don't have permission to delete products");
      return;
    }

    if (this.selectedProducts.size === 0) {
      this.toast.error('Please select products to delete');
      return;
    }

    const count = this.selectedProducts.size;
    if (confirm(`Are you sure you want to delete ${count} product(s)?`)) {
      this.loading = true;
      const deletePromises = Array.from(this.selectedProducts).map((id) =>
        this.productService.deleteProduct(id).toPromise(),
      );

      Promise.all(deletePromises)
        .then(() => {
          this.toast.success(`${count} product(s) deleted successfully`);
          this.selectedProducts.clear();
          this.selectAll = false;
          this.getAllProducts(this.query);
          this.loadAnalytics();
        })
        .catch((error) => {
          console.error('Error deleting products', error);
          this.toast.error('Failed to delete some products');
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }

  // Status badge helper methods
  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      DISCONTINUED: 'bg-red-100 text-red-800',
      OUT_OF_STOCK: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-purple-100 text-purple-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    if (!status) return 'ACTIVE';
    return status.replace('_', ' ');
  }

  isTrackedProduct(product: Product): boolean {
    return !!product.trackingMode && product.trackingMode !== 'NONE';
  }

  getTrackingLabel(product: Product): string {
    if (!product.trackingMode || product.trackingMode === 'NONE') {
      return 'Normal';
    }

    if (product.trackingMode === 'IMEI') return 'IMEI';
    if (product.trackingMode === 'REGISTRATION') return 'Reg No';
    if (product.trackingMode === 'SERIAL') return 'Serial';
    return product.trackingMode;
  }

  get filteredProductUnits(): ProductUnit[] {
    // Server handles filtering now; just return the loaded data
    return this.productUnits;
  }

  openUnitsModal(product: Product): void {
    this.selectedUnitProduct = product;
    this.showUnitsModal = true;
    this.unitSearchQuery = '';
    this.unitStatusFilter = 'ALL';
    this.unitDateFrom = '';
    this.unitDateTo = '';
    this.unitPage = 1;
    this.showHistoryPanel = false;
    this.selectedUnit = null;
    this.loadProductUnits(product.id);
  }

  closeUnitsModal(): void {
    this.showUnitsModal = false;
    this.selectedUnitProduct = null;
    this.productUnits = [];
    this.showHistoryPanel = false;
    this.selectedUnit = null;
    this.unitHistory = [];
  }

  loadProductUnits(productId: number): void {
    this.unitLoading = true;
    const options: any = {
      page: this.unitPage,
      limit: this.unitLimit,
    };
    if (this.unitStatusFilter !== 'ALL') {
      options.status = this.unitStatusFilter;
    }
    if (this.unitDateFrom) {
      options.startDate = this.unitDateFrom;
    }
    if (this.unitDateTo) {
      options.endDate = this.unitDateTo;
    }
    if (this.unitSearchQuery.trim()) {
      options.search = this.unitSearchQuery.trim();
    }

    this.productService.getProductUnits(productId, options).subscribe({
      next: (response) => {
        this.productUnits = response.data;
        this.unitTotal = response.total;
        this.unitTotalPages = response.totalPages;
        this.unitPage = response.page;
        this.unitLoading = false;
      },
      error: (error) => {
        console.error('Error loading product units', error);
        this.toast.error('Failed to load unit identifiers');
        this.unitLoading = false;
      },
    });
  }

  onUnitFilterChange(): void {
    this.unitPage = 1;
    if (this.selectedUnitProduct) {
      this.loadProductUnits(this.selectedUnitProduct.id);
    }
  }

  onUnitSearchChange(): void {
    clearTimeout(this.unitSearchTimeout);
    this.unitSearchTimeout = setTimeout(() => {
      this.unitPage = 1;
      if (this.selectedUnitProduct) {
        this.loadProductUnits(this.selectedUnitProduct.id);
      }
    }, 400);
  }

  goToUnitPage(page: number): void {
    if (page < 1 || page > this.unitTotalPages) return;
    this.unitPage = page;
    if (this.selectedUnitProduct) {
      this.loadProductUnits(this.selectedUnitProduct.id);
    }
  }

  get unitPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.unitPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.unitTotalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Unit history
  openUnitHistory(unit: ProductUnit): void {
    this.selectedUnit = unit;
    this.showHistoryPanel = true;
    this.historyLoading = true;
    this.unitHistory = [];

    if (!this.selectedUnitProduct) return;

    this.productService
      .getUnitHistory(this.selectedUnitProduct.id, unit.id)
      .subscribe({
        next: (response) => {
          this.unitHistory = response.timeline;
          this.historyLoading = false;
        },
        error: (error) => {
          console.error('Error loading unit history', error);
          this.toast.error('Failed to load unit history');
          this.historyLoading = false;
        },
      });
  }

  closeUnitHistory(): void {
    this.showHistoryPanel = false;
    this.selectedUnit = null;
    this.unitHistory = [];
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  deleteProduct(id: number): void {
    // Check delete permission
    if (!this.canDeleteProduct) {
      this.toast.error("You don't have permission to delete products");
      return;
    }

    if (confirm('Are you sure you want to delete this product?')) {
      this.loading = true;
      this.productService.deleteProduct(id).subscribe({
        next: (res) => {
          this.getAllProducts(this.query); // Refresh products after deletion
          this.loadAnalytics(); // Refresh analytics after deletion
        },
        error: (error: any) => {
          console.error('Error deleting product', error);
          this.loading = false;
          // Add user-friendly error handling here
        },
      });
    }
  }

  openDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog().subscribe((resp) => {
      console.log('Response from dialog content:', resp);
      if (resp) {
        this.getAllProducts();
        this.loadAnalytics(); // Refresh analytics after upload
      }
    });
  }

  openAddDialog() {
    this.addProductdialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.addProductdialog.openDialog().subscribe((resp) => {
      console.log('Response from dialog content:', resp);
      if (resp) {
        this.getAllProducts();
        this.loadAnalytics(); // Refresh analytics after adding
      }
    });
  }

  openUpdateDialog(product: Product) {
    // Check update permission
    if (!this.canUpdateProduct) {
      this.toast.error("You don't have permission to update products");
      return;
    }
    this.updateProductdialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateProductdialog.openDialog(product).subscribe((resp) => {
      console.log('Response from dialog content:', resp);
      if (resp) {
        this.getAllProducts();
        this.loadAnalytics(); // Refresh analytics after updating
      }
    });
  }
}
