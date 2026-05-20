import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../interfaces/products';

@Component({
  selector: 'app-selected-products',
  templateUrl: './selected-products.component.html',
  styleUrls: ['./selected-products.component.scss'],
})
export class SelectedProductsComponent {
  @Input() products: Product[] = [];
  @Input() currencySymbol = 'KSh';

  @Output() remove = new EventEmitter<number>();
  @Output() changeQty = new EventEmitter<{ id: number; qty: number }>();
  @Output() edit = new EventEmitter<number>();
  @Output() priceTypeChange = new EventEmitter<{
    id: number;
    priceType: 'retail' | 'wholesale';
  }>();
  @Output() priceChange = new EventEmitter<{ id: number; price: number }>();
  @Output() taxTypeChange = new EventEmitter<{
    id: number;
    taxType: 'exempt' | 'inclusive' | 'exclusive';
  }>();

  // Track price type for each product (retail or wholesale)
  priceTypes: { [productId: number]: 'retail' | 'wholesale' } = {};
  // Track if price is being edited
  editingPrice: { [productId: number]: boolean } = {};
  // Track tax type for each product
  taxTypes: { [productId: number]: 'exempt' | 'inclusive' | 'exclusive' } = {};

  trackById(index: number, item: Product) {
    return item.id;
  }

  onRemove(id: number) {
    this.remove.emit(id);
  }

  onQtyChange(id: number, qty: number) {
    const n = Number(qty) || 0;
    if (n < 0) return;
    this.changeQty.emit({ id, qty: n });
  }

  hasWholesalePrice(product: Product): boolean {
    return !!product.wholesalePrice && product.wholesalePrice !== product.price;
  }

  togglePriceType(productId: number, priceType: 'retail' | 'wholesale') {
    this.priceTypes[productId] = priceType;
    this.priceTypeChange.emit({ id: productId, priceType });
  }

  getPriceType(productId: number): 'retail' | 'wholesale' {
    return this.priceTypes[productId] || 'retail';
  }

  getCurrentPrice(product: Product): number {
    const priceType = this.getPriceType(product.id);
    return priceType === 'wholesale' && product.wholesalePrice
      ? product.wholesalePrice
      : product.price;
  }

  onPriceChange(id: number, newPrice: number) {
    const price = Number(newPrice) || 0;
    if (price < 0) return;
    this.priceChange.emit({ id, price });
    this.editingPrice[id] = false;
  }

  togglePriceEdit(id: number) {
    this.editingPrice[id] = !this.editingPrice[id];
  }

  isEditingPrice(id: number): boolean {
    return this.editingPrice[id] || false;
  }

  // Tax type methods
  getTaxType(productId: number): 'exempt' | 'inclusive' | 'exclusive' {
    const product = this.products.find((p) => p.id === productId);

    // If manually set, use that
    if (this.taxTypes[productId]) {
      return this.taxTypes[productId];
    }

    // If product has taxType set, use it
    if (product?.taxType) {
      return product.taxType;
    }

    // Apply automatic tax logic based on product configuration
    if (product) {
      // If not taxable → exempt
      if (product.isTaxable === false) {
        return 'exempt';
      }

      // If taxable and taxInclusive → inclusive (default)
      if (product.isTaxable === true && product.taxInclusive === true) {
        return 'inclusive';
      }

      // If taxable and not taxInclusive → exclusive (add tax)
      if (product.isTaxable === true && product.taxInclusive === false) {
        return 'exclusive';
      }
    }

    // Default fallback
    return 'inclusive';
  }

  toggleTaxType(
    productId: number,
    taxType: 'exempt' | 'inclusive' | 'exclusive'
  ) {
    this.taxTypes[productId] = taxType;
    const product = this.products.find((p) => p.id === productId);
    if (product) {
      product.taxType = taxType;
    }
    this.taxTypeChange.emit({ id: productId, taxType });
  }

  calculateTax(product: Product): number {
    const taxType = this.getTaxType(product.id);
    if (taxType === 'exempt') {
      return 0;
    }

    const qty = (product.selectedItems as number) || 0;
    const price = this.getCurrentPrice(product);
    const subtotal = qty * price;
    const discount = (product.discountValue as number) || 0;
    const afterDiscount = subtotal - discount;

    // Use product's tax rate if available, otherwise default to 16%
    const taxRatePercentage = product.taxRate || 16;
    const VAT_RATE = taxRatePercentage / 100; // Convert to decimal (16 → 0.16)
    const divisor = 1 + VAT_RATE; // For inclusive calculation (1.16 for 16%)

    if (taxType === 'inclusive') {
      // Tax is already included in price
      // Tax = Price - (Price / divisor)
      // Example: For 16% tax, Tax = Price - (Price / 1.16)
      return afterDiscount - afterDiscount / divisor;
    } else {
      // Exclusive - tax is added on top
      return afterDiscount * VAT_RATE;
    }
  }

  itemTotal(p: Product) {
    const qty = (p.selectedItems as number) || 0;
    const price = this.getCurrentPrice(p);
    const discount = (p.discountValue as number) || 0;
    const subtotal = qty * price - discount;

    const taxType = this.getTaxType(p.id);

    if (taxType === 'exclusive') {
      // Add tax on top
      return subtotal + this.calculateTax(p);
    } else {
      // For exempt and inclusive, total stays the same
      return subtotal;
    }
  }

  getItemSubtotal(p: Product): number {
    const qty = (p.selectedItems as number) || 0;
    const price = this.getCurrentPrice(p);
    const discount = (p.discountValue as number) || 0;
    const subtotal = qty * price - discount;

    const taxType = this.getTaxType(p.id);

    if (taxType === 'inclusive') {
      // Remove tax to get base amount
      const taxRatePercentage = p.taxRate || 16;
      const divisor = 1 + taxRatePercentage / 100; // 1.16 for 16%
      return subtotal / divisor;
    }

    return subtotal;
  }

  getTotalQuantity(): number {
    return this.products.reduce((total, product) => {
      return total + ((product.selectedItems as number) || 0);
    }, 0);
  }

  getTotalTax(): number {
    return this.products.reduce((total, product) => {
      return total + this.calculateTax(product);
    }, 0);
  }

  getGrandTotal(): number {
    return this.products.reduce((total, product) => {
      return total + this.itemTotal(product);
    }, 0);
  }
}
