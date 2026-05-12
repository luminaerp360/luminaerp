import { Component } from '@angular/core';
import { ProductService } from '../../../shared/Services/product.service';
import { Product } from '../../../shared/interfaces/products';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class SalesComponent {
  searchQuery: string = '';
  filteredProducts: Product[] = [];
  selectedProduct: Product | null = null;
  quantity: number = 1;
  discount: number = 0;
  paymentMode: string = 'cash';
  saleCompleted: boolean = false;
  subtotal: number = 0;
  tax: number = 0;
  total: number = 0;

  constructor(private productService: ProductService) {}
  ngOnInit() {
    this.getAllProducts();
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
    this.quantity = 1;
    this.discount = 0;
    this.paymentMode = 'cash';
    this.saleCompleted = false;
  }

  completeSale() {
    if (this.selectedProduct) {
      const discountAmount =
        (this.discount / 100) * this.selectedProduct.price * this.quantity;
      this.subtotal =
        this.selectedProduct.price * this.quantity - discountAmount;
      this.tax = 0.16 * this.subtotal;
      this.total = this.subtotal + this.tax;
      this.saleCompleted = true;
    }
  }
  getAllProducts(searchQuery?: string): void {
    this.productService.getAllProducts().subscribe((products) => {
      if (searchQuery && searchQuery.trim() !== '') {
        this.filteredProducts = products.filter((product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        this.filteredProducts = products;
      }
      console.log('Filtered products', this.filteredProducts);
    });
  }
}
