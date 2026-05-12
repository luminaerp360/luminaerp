import { Component } from '@angular/core';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { Inventory } from '../../../../shared/interfaces/inventory.interface';
import { ProductService } from '../../../../shared/Services/product.service';
import { Product } from '../../../../shared/interfaces/products';
import { InventoryMovementService } from '../../../../shared/Services/inventory-movement.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent {
  products: any[] = [];
  selectedProducts: any[] = [];
  isInitialLoading = true;
  isLoading = false;
  isAllSelected = false;
  showRestockModal = false;
  showAdjustmentModal = false;
  restockQuantities: { [productId: number]: number } = {};
  restockPrices: { [productId: number]: number } = {};

  // Adjustment properties
  adjustmentQuantities: { [productId: number]: number } = {};
  adjustmentTypes: { [productId: number]: string } = {};
  adjustmentReasons: { [productId: number]: string } = {};
  adjustmentNotes: { [productId: number]: string } = {};

  // Available adjustment types
  adjustmentTypeOptions = [
    { value: 'EXPIRED', label: 'Expired Stock', icon: '⏰' },
    { value: 'DAMAGE', label: 'Damaged/Defective', icon: '⚠️' },
    { value: 'THEFT', label: 'Theft/Loss', icon: '🚫' },
    { value: 'SAMPLE', label: 'Sample/Demo', icon: '🎁' },
    { value: 'ADJUSTMENT_DECREASE', label: 'Stock Count Decrease', icon: '📉' },
    { value: 'ADJUSTMENT_INCREASE', label: 'Stock Count Increase', icon: '📈' },
  ];

  constructor(
    private productService: ProductService,
    private movementService: InventoryMovementService,
    private toast: HotToastService,
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        // Filter out services - only show physical products
        this.products = data.filter((product: any) => !product.isService);
        this.isInitialLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isInitialLoading = false;
      },
    });
  }

  openRestockModal() {
    if (this.selectedProducts.length === 0) return;

    // Initialize restock quantities and prices for selected products
    this.restockQuantities = {};
    this.restockPrices = {};
    this.selectedProducts.forEach((product) => {
      this.restockQuantities[product.id] = 0;
      this.restockPrices[product.id] =
        product.buying_price || product.buyingPrice || 0;
    });

    this.showRestockModal = true;
  }

  closeRestockModal() {
    this.showRestockModal = false;
    this.restockQuantities = {};
    this.restockPrices = {};
  }

  restockProducts() {
    this.isLoading = true;

    // Prepare restock data with quantities and buying prices
    const restockData = this.selectedProducts
      .filter((product) => this.restockQuantities[product.id] > 0)
      .map((product) => ({
        productId: product.id,
        quantity: this.restockQuantities[product.id],
        buyingPrice: this.restockPrices[product.id],
      }));

    if (restockData.length === 0) {
      this.isLoading = false;
      return;
    }

    // Call bulk update endpoint
    this.productService.bulkUpdateStock(restockData).subscribe({
      next: () => {
        this.isLoading = false;
        this.closeRestockModal();
        this.selectedProducts = [];
        this.isAllSelected = false;
        this.loadProducts(); // Reload to show updated quantities
      },
      error: (error) => {
        console.error('Error restocking products:', error);
        this.isLoading = false;
      },
    });
  }

  toggleAllSelection(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.isAllSelected = checkbox.checked;
    this.selectedProducts = checkbox.checked ? [...this.products] : [];
  }

  toggleProductSelection(product: any) {
    const index = this.selectedProducts.findIndex((p) => p.id === product.id);
    if (index === -1) {
      this.selectedProducts.push(product);
    } else {
      this.selectedProducts.splice(index, 1);
    }
    this.isAllSelected = this.selectedProducts.length === this.products.length;
  }

  isProductSelected(product: any): boolean {
    return this.selectedProducts.some((p) => p.id === product.id);
  }

  // ============================================
  // STOCK ADJUSTMENT METHODS
  // ============================================

  openAdjustmentModal() {
    if (this.selectedProducts.length === 0) {
      this.toast.warning('Please select at least one product to adjust');
      return;
    }

    // Initialize adjustment data for selected products
    this.adjustmentQuantities = {};
    this.adjustmentTypes = {};
    this.adjustmentReasons = {};
    this.adjustmentNotes = {};

    this.selectedProducts.forEach((product) => {
      this.adjustmentQuantities[product.id] = 0;
      this.adjustmentTypes[product.id] = 'EXPIRED';
      this.adjustmentReasons[product.id] = '';
      this.adjustmentNotes[product.id] = '';
    });

    this.showAdjustmentModal = true;
  }

  closeAdjustmentModal() {
    this.showAdjustmentModal = false;
    this.adjustmentQuantities = {};
    this.adjustmentTypes = {};
    this.adjustmentReasons = {};
    this.adjustmentNotes = {};
  }

  adjustStock() {
    // Validate adjustments
    const validAdjustments = this.selectedProducts.filter(
      (product) =>
        this.adjustmentQuantities[product.id] > 0 &&
        this.adjustmentReasons[product.id].trim() !== '',
    );

    if (validAdjustments.length === 0) {
      this.toast.error(
        'Please enter quantity and reason for at least one product',
      );
      return;
    }

    // Check if any adjustment would make stock negative
    const invalidAdjustments = validAdjustments.filter((product) => {
      const adjustmentType = this.adjustmentTypes[product.id];
      const isDecrease = [
        'EXPIRED',
        'DAMAGE',
        'THEFT',
        'SAMPLE',
        'ADJUSTMENT_DECREASE',
      ].includes(adjustmentType);

      if (isDecrease) {
        const newQuantity =
          product.quantity - this.adjustmentQuantities[product.id];
        return newQuantity < 0;
      }
      return false;
    });

    if (invalidAdjustments.length > 0) {
      const productNames = invalidAdjustments.map((p) => p.name).join(', ');
      this.toast.error(`Insufficient stock for: ${productNames}`);
      return;
    }

    this.isLoading = true;

    // Create adjustment requests - send directly to backend with correct format
    const adjustmentPromises = validAdjustments.map((product) => {
      const adjustmentType = this.adjustmentTypes[product.id];
      const isIncrease = adjustmentType === 'ADJUSTMENT_INCREASE';
      const quantityChange = isIncrease
        ? this.adjustmentQuantities[product.id]
        : -this.adjustmentQuantities[product.id];

      // Create movement DTO with correct backend field names
      const movementData = {
        productId: product.id,
        movementType: adjustmentType,
        quantityChange: quantityChange,
        unitCost: product.buyingPrice || product.buying_price,
        reason: this.adjustmentReasons[product.id],
        notes: this.adjustmentNotes[product.id] || undefined,
      };

      return this.movementService
        .createMovement(movementData as any)
        .toPromise();
    });

    // Execute all adjustments
    Promise.all(adjustmentPromises)
      .then(() => {
        this.toast.success(
          `Successfully adjusted ${validAdjustments.length} product(s). View in Stock Movements.`,
          { duration: 5000 }
        );
        this.isLoading = false;
        this.closeAdjustmentModal();
        this.selectedProducts = [];
        this.isAllSelected = false;
        this.loadProducts();
      })
      .catch((error) => {
        console.error('Error adjusting stock:', error);
        this.toast.error('Failed to adjust stock. Please try again.');
        this.isLoading = false;
      });
  }

  getAdjustmentTypeLabel(value: string): string {
    const type = this.adjustmentTypeOptions.find((t) => t.value === value);
    return type ? type.label : value;
  }

  isDecreaseAdjustment(productId: number): boolean {
    const type = this.adjustmentTypes[productId];
    return [
      'EXPIRED',
      'DAMAGE',
      'THEFT',
      'SAMPLE',
      'ADJUSTMENT_DECREASE',
    ].includes(type);
  }

  // openDialog(optionalPayload?: any) {
  //   this.dialog.options = {
  //     width: '400px',
  //     height: '500px',
  //     showOverlay: true,
  //     animationIn: AppearanceAnimation.ZOOM_IN,
  //     animationOut: DisappearanceAnimation.ZOOM_OUT,
  //   };

  //   this.dialog.openDialog().subscribe((resp) => {
  //     console.log('Response from dialog content:', resp);
  //   });
  // }

  // closeDialog() {
  //   this.dialog.closeDialog();
  // }
}
