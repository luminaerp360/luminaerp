/**
 * EXAMPLE: Sales Page Component with Global CRUD Permissions
 *
 * Shows how to apply permissions in a sales/transaction context
 */

import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../src/app/shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';

interface Sale {
  id: number;
  customerName: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

@Component({
  selector: 'app-sales',
  template:
    '<div>Sales Example Component - See source for implementation</div>',
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  isLoading: boolean = false;

  // Permission flags
  canCreateSale: boolean = false;
  canUpdateSale: boolean = false;
  canDeleteSale: boolean = false;
  canViewSales: boolean = false;

  constructor(
    public permissionService: PermissionService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadPermissions();

    if (!this.canViewSales) {
      this.toast.error("You don't have permission to view sales");
      return;
    }

    this.loadSales();
  }

  private loadPermissions(): void {
    this.canViewSales = this.permissionService.canPerformAction(
      'sales',
      'view',
    );
    this.canCreateSale = this.permissionService.canPerformAction(
      'sales',
      'create',
    );
    this.canUpdateSale = this.permissionService.canPerformAction(
      'sales',
      'update',
    );
    this.canDeleteSale = this.permissionService.canPerformAction(
      'sales',
      'delete',
    );
  }

  loadSales(): void {
    this.isLoading = true;
    // Load sales from API
    setTimeout(() => {
      this.sales = [
        {
          id: 1,
          customerName: 'John Doe',
          amount: 500,
          date: new Date(),
          status: 'completed',
        },
      ];
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Navigate to create new sale
   */
  createNewSale(): void {
    if (!this.canCreateSale) {
      this.toast.error("You don't have permission to create sales");
      return;
    }

    console.log('Creating new sale...');
    // Navigate to sales form or open modal
  }

  /**
   * Edit/Update existing sale
   */
  editSale(sale: Sale): void {
    if (!this.canUpdateSale) {
      this.toast.error("You don't have permission to edit sales");
      return;
    }

    // Only allow editing pending sales
    if (sale.status !== 'pending') {
      this.toast.error('Only pending sales can be edited');
      return;
    }

    console.log('Editing sale:', sale);
  }

  /**
   * Void/Cancel a sale (this is a DELETE operation)
   */
  voidSale(saleId: number): void {
    if (!this.canDeleteSale) {
      this.toast.error("You don't have permission to void sales");
      return;
    }

    if (!confirm('Are you sure you want to void this sale?')) {
      return;
    }

    console.log('Voiding sale:', saleId);
    // API call to void sale
  }

  /**
   * Print sale receipt (VIEW operation)
   */
  printReceipt(sale: Sale): void {
    if (!this.canViewSales) {
      this.toast.error("You don't have permission to print receipts");
      return;
    }

    console.log('Printing receipt for sale:', sale.id);
    // Print logic here
  }

  /**
   * Process refund (UPDATE operation - modifies the sale)
   */
  processRefund(sale: Sale): void {
    if (!this.canUpdateSale) {
      this.toast.error("You don't have permission to process refunds");
      return;
    }

    if (!confirm('Are you sure you want to process a refund?')) {
      return;
    }

    console.log('Processing refund for sale:', sale.id);
    // Refund logic here
  }
}
