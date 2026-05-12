/**
 * EXAMPLE: Products Page Component with Global CRUD Permissions
 *
 * This example demonstrates the complete refactoring pattern for a products page
 */

import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../src/app/shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';
import { Router } from '@angular/router';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

@Component({
  selector: 'app-products',
  template:
    '<div>Products Example Component - See source for implementation</div>',
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  isLoading: boolean = false;

  // Permission flags
  canCreateProduct: boolean = false;
  canUpdateProduct: boolean = false;
  canDeleteProduct: boolean = false;
  canViewProducts: boolean = false;

  constructor(
    private permissionService: PermissionService,
    private toast: HotToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPermissions();

    // Page-level access check
    if (!this.permissionService.hasModuleAccess('products')) {
      this.toast.error("You don't have access to the products module");
      this.router.navigate(['/dashboard']);
      return;
    }

    // View permission check
    if (!this.canViewProducts) {
      this.toast.error("You don't have permission to view products");
      return;
    }

    this.loadProducts();
  }

  /**
   * Load permission flags
   */
  private loadPermissions(): void {
    // Using canPerformAction helper (recommended approach)
    this.canViewProducts = this.permissionService.canPerformAction(
      'products',
      'view',
    );
    this.canCreateProduct = this.permissionService.canPerformAction(
      'products',
      'create',
    );
    this.canUpdateProduct = this.permissionService.canPerformAction(
      'products',
      'update',
    );
    this.canDeleteProduct = this.permissionService.canPerformAction(
      'products',
      'delete',
    );
  }

  /**
   * Load products from API
   */
  loadProducts(): void {
    if (!this.canViewProducts) {
      return;
    }

    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.products = [
        {
          id: 1,
          name: 'Product A',
          price: 100,
          stock: 50,
          category: 'Electronics',
        },
        {
          id: 2,
          name: 'Product B',
          price: 200,
          stock: 30,
          category: 'Clothing',
        },
        { id: 3, name: 'Product C', price: 150, stock: 20, category: 'Food' },
      ];
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Open modal to create new product
   */
  openCreateProductModal(): void {
    if (!this.canCreateProduct) {
      this.toast.error("You don't have permission to create products");
      return;
    }

    console.log('Opening create product modal...');
    // Modal opening logic here
  }

  /**
   * Edit product
   */
  editProduct(product: Product): void {
    if (!this.canUpdateProduct) {
      this.toast.error("You don't have permission to edit products");
      return;
    }

    console.log('Editing product:', product);
    // Edit logic here
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: number): Promise<void> {
    // Permission check
    if (!this.canDeleteProduct) {
      this.toast.error("You don't have permission to delete products");
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      // API call would go here
      // await this.productService.delete(productId);
      this.toast.success('Product deleted successfully');
      this.loadProducts();
    } catch (error) {
      this.toast.error('Failed to delete product');
    }
  }

  /**
   * Import products from file
   */
  importProducts(): void {
    // Importing is considered a CREATE operation
    if (!this.canCreateProduct) {
      this.toast.error("You don't have permission to import products");
      return;
    }

    console.log('Importing products...');
    // Import logic here
  }

  /**
   * Export products to file
   */
  exportProducts(): void {
    // Exporting is a READ/VIEW operation
    if (!this.canViewProducts) {
      this.toast.error("You don't have permission to export products");
      return;
    }

    console.log('Exporting products...');
    // Export logic here
  }

  /**
   * Update product stock (quick update)
   */
  updateStock(productId: number, newStock: number): void {
    if (!this.canUpdateProduct) {
      this.toast.error("You don't have permission to update product stock");
      return;
    }

    console.log(`Updating stock for product ${productId} to ${newStock}`);
    // Update logic here
  }
}
