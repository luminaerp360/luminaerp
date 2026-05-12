# Product Selector Component

A modern, reusable Angular component for product selection with an integrated shopping cart. Perfect for POS systems, e-commerce, quotations, and sales applications.

## Features

✨ **Modern UI** - Glass morphism design with smooth animations
🔍 **Advanced Search** - Real-time product search with filtering
📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile
🛒 **Smart Cart** - Built-in cart with quantity, discounts, and VAT
🏷️ **Price Management** - Support for retail and wholesale pricing
📊 **Barcode Scanner** - Integrated barcode scanning functionality
🎨 **Customizable** - Multiple theme colors and configuration options
⚡ **Performance** - Optimized with trackBy and lazy loading

## Installation

1. Import the `SharedModule` in your module:

```typescript
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    // ... other imports
  ],
})
export class YourModule {}
```

## Basic Usage

### Minimal Setup

```html
<app-product-selector
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (checkoutClicked)="onCheckout()"
>
</app-product-selector>
```

```typescript
export class YourComponent {
  products: Product[] = [];
  selectedProducts: Product[] = [];

  ngOnInit() {
    // Load products from your service
    this.productService.getAllProducts().subscribe(
      products => this.products = products
    );
  }

  onCheckout() {
    // Handle checkout logic
    console.log('Cart:', this.selectedProducts);
  }
}
```

## Configuration Options

### Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `themeColor` | `'blue' \| 'purple' \| 'orange' \| 'green'` | `'blue'` | Primary theme color |
| `cartTitle` | `string` | `'Shopping Cart'` | Title displayed in cart header |
| `checkoutButtonText` | `string` | `'Continue to Checkout'` | Text for checkout button |
| `showCheckoutButton` | `boolean` | `true` | Show/hide checkout button |
| `enableBarcodeScanner` | `boolean` | `true` | Enable barcode scanning |
| `enableCustomProducts` | `boolean` | `true` | Allow adding custom products |
| `enableDiscounts` | `boolean` | `true` | Enable discount functionality |
| `enableVAT` | `boolean` | `true` | Enable VAT toggle |
| `showFilters` | `boolean` | `true` | Show filter chips |
| `gridColumns` | `2 \| 3 \| 4` | `3` | Number of product grid columns |
| `autoFocusSearch` | `boolean` | `true` | Auto-focus search on load |
| `products` | `Product[]` | `[]` | Product list (optional if loading internally) |
| `selectedProducts` | `Product[]` | `[]` | Current cart items |

### Output Events

| Event | Payload | Description |
|-------|---------|-------------|
| `productsChange` | `Product[]` | Emitted when products list changes |
| `selectedProductsChange` | `Product[]` | Emitted when cart changes |
| `productAdded` | `Product` | Emitted when product added to cart |
| `productRemoved` | `{ product: Product, index: number }` | Emitted when product removed |
| `checkoutClicked` | `void` | Emitted when checkout button clicked |
| `barcodeScanned` | `string` | Emitted when barcode scanned |

## Advanced Examples

### Custom Theme (Cash Sales - Blue)

```html
<app-product-selector
  themeColor="blue"
  cartTitle="Cash Sale Cart"
  checkoutButtonText="Process Payment"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (checkoutClicked)="onProcessPayment()"
>
</app-product-selector>
```

### Credit Sales (Orange Theme)

```html
<app-product-selector
  themeColor="orange"
  cartTitle="Credit Sale Cart"
  checkoutButtonText="Create Credit Sale"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (checkoutClicked)="onCreateCreditSale()"
>
</app-product-selector>
```

### Quotations (Purple Theme)

```html
<app-product-selector
  themeColor="purple"
  cartTitle="Quotation Items"
  checkoutButtonText="Generate Quote"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (checkoutClicked)="onGenerateQuote()"
  (barcodeScanned)="handleBarcode($event)"
>
</app-product-selector>
```

### Minimal Cart (No Discounts or VAT)

```html
<app-product-selector
  themeColor="green"
  [enableDiscounts]="false"
  [enableVAT]="false"
  [enableBarcodeScanner]="false"
  [enableCustomProducts]="false"
  [showFilters]="false"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
>
</app-product-selector>
```

### Simple Product Picker (No Checkout Button)

```html
<app-product-selector
  [showCheckoutButton]="false"
  [gridColumns]="4"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (productAdded)="onProductAdded($event)"
>
</app-product-selector>
```

## Programmatic Access

You can access the component methods using `ViewChild`:

```typescript
import { ViewChild } from '@angular/core';
import { ProductSelectorComponent } from '@app/shared/components/product-selector/product-selector.component';

export class YourComponent {
  @ViewChild(ProductSelectorComponent) productSelector!: ProductSelectorComponent;

  // Get cart data
  getCartData() {
    return this.productSelector.getCartData();
  }

  // Clear cart
  clearCart() {
    this.productSelector.clearCart();
  }

  // Load saved cart
  loadSavedCart(cartData: any) {
    this.productSelector.loadCart(cartData);
  }
}
```

## Cart Data Structure

The component returns comprehensive cart data:

```typescript
interface CartData {
  products: Product[];
  subtotal: number;
  totalDiscount: number;
  totalVAT: number;
  total: number;
  globalDiscount: number;
  itemVatSettings: { [productId: number]: boolean };
  itemPriceTypes: { [productId: number]: 'retail' | 'wholesale' };
}
```

## Styling

The component uses modern design patterns:

- **Glass Morphism** - Translucent cards with backdrop blur
- **Smooth Animations** - Slide, fade, and scale transitions
- **Hover Effects** - Interactive product cards
- **Custom Scrollbars** - Styled overflow areas
- **Responsive Grid** - Adaptive layouts for all screens

### Theme Colors

- **Blue** (#3b82f6) - Cash sales, general purpose
- **Purple** (#a855f7) - Quotations, proposals
- **Orange** (#f97316) - Credit sales, invoices
- **Green** (#10b981) - Services, subscriptions

## Best Practices

1. **Always use two-way binding** for `selectedProducts`:
   ```html
   [(selectedProducts)]="selectedProducts"
   ```

2. **Handle checkout event**:
   ```typescript
   onCheckout() {
     const cartData = this.productSelector.getCartData();
     // Process the cart data
   }
   ```

3. **Provide products efficiently**:
   ```typescript
   // Load once and reuse
   ngOnInit() {
     this.productService.getAllProducts().subscribe(
       products => this.products = products
     );
   }
   ```

4. **Clear cart after successful transactions**:
   ```typescript
   afterSuccessfulSale() {
     this.productSelector.clearCart();
     // or
     this.selectedProducts = [];
   }
   ```

## Integration Examples

### Replace Existing Product Selection

#### Before (in your component HTML):
```html
<!-- Old product grid and cart code -->
<div class="products-section">
  <!-- 100+ lines of complex HTML -->
</div>
```

#### After:
```html
<!-- Just one line! -->
<app-product-selector
  [themeColor]="'blue'"
  [products]="products"
  [(selectedProducts)]="selectedProducts"
  (checkoutClicked)="onCheckout()"
>
</app-product-selector>
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance Tips

1. Use `trackBy` functions (already implemented internally)
2. Limit initial product load to ~100 items
3. Implement virtual scrolling for 1000+ products
4. Use async pipe for product streams

## Troubleshooting

### Products not showing?
- Ensure products array is not empty
- Check console for errors
- Verify Product interface matches your data

### Cart not updating?
- Use two-way binding: `[(selectedProducts)]`
- Check that Product objects have unique `id` values

### Styling issues?
- Import component styles in your styles.scss
- Ensure Tailwind CSS is configured properly

## License

This component is part of the DasaDove POS system.

## Support

For issues or questions, please contact the development team.
