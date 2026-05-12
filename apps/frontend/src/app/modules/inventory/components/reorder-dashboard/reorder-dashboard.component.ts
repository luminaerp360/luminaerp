import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { HotToastService } from '@ngneat/hot-toast';
import { WarehouseReorderService } from '../../../../shared/Services/warehouse-reorder.service';
import { ProductService } from '../../../../shared/Services/product.service';
import {
  ReorderRule,
  CreateReorderRuleDto,
  UpdateReorderRuleDto,
  ReorderAlert,
} from '../../../../shared/interfaces/modern-inventory.interface';

interface Product {
  id: number;
  name: string;
  current_stock?: number;
  buying_price?: number;
  [key: string]: any;
}

@Component({
  selector: 'app-reorder-dashboard',
  templateUrl: './reorder-dashboard.component.html',
  styleUrls: ['./reorder-dashboard.component.scss'],
})
export class ReorderDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  reorderAlerts: ReorderAlert[] = [];
  reorderRules: ReorderRule[] = [];
  products: Product[] = [];
  selectedRule: ReorderRule | null = null;
  selectedAlert: ReorderAlert | null = null;

  // UI State
  showCreateRuleModal = false;
  showEditRuleModal = false;
  showAlertDetailsModal = false;
  isLoadingAlerts = false;
  isLoadingRules = false;
  isCreatingRule = false;
  isTriggeringCheck = false;
  autoRefresh = true;

  // Form
  ruleForm: CreateReorderRuleDto = {
    productId: 0,
    minStock: 0,
    maxStock: 0,
    reorderQuantity: 0,
  };

  // Stats
  criticalAlerts = 0;
  warningAlerts = 0;
  totalActiveRules = 0;

  constructor(
    private warehouseReorderService: WarehouseReorderService,
    private productService: ProductService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupAutoRefresh(): void {
    // Refresh alerts every 5 minutes
    interval(300000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh) {
          this.loadReorderAlerts();
        }
      });
  }

  loadData(): void {
    this.loadReorderAlerts();
    this.loadReorderRules();
    this.loadProducts();
  }

  loadReorderAlerts(): void {
    this.isLoadingAlerts = true;

    this.warehouseReorderService
      .getReorderAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.reorderAlerts = alerts;
          this.calculateAlertStats();
          this.isLoadingAlerts = false;
        },
        error: (error) => {
          console.error('Error loading reorder alerts:', error);
          this.toast.error('Failed to load reorder alerts');
          this.isLoadingAlerts = false;
        },
      });
  }

  loadReorderRules(): void {
    this.isLoadingRules = true;

    this.warehouseReorderService
      .getAllReorderRules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rules) => {
          this.reorderRules = rules;
          this.totalActiveRules = rules.filter((r) => r.enabled).length;
          this.isLoadingRules = false;
        },
        error: (error) => {
          console.error('Error loading reorder rules:', error);
          this.toast.error('Failed to load reorder rules');
          this.isLoadingRules = false;
        },
      });
  }

  loadProducts(): void {
    this.productService
      .getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: any) => {
          this.products = products;
        },
        error: (error: any) => {
          console.error('Error loading products:', error);
        },
      });
  }

  calculateAlertStats(): void {
    this.criticalAlerts = this.reorderAlerts.filter(
      (a) => a.urgency === 'critical',
    ).length;
    this.warningAlerts = this.reorderAlerts.filter(
      (a) => a.urgency === 'warning',
    ).length;
  }

  // Create Reorder Rule
  openCreateRuleModal(): void {
    this.resetRuleForm();
    this.showCreateRuleModal = true;
  }

  closeCreateRuleModal(): void {
    this.showCreateRuleModal = false;
    this.resetRuleForm();
  }

  resetRuleForm(): void {
    this.ruleForm = {
      productId: 0,
      minStock: 0,
      maxStock: 0,
      reorderQuantity: 0,
    };
  }

  createReorderRule(): void {
    if (!this.validateRuleForm()) {
      return;
    }

    this.isCreatingRule = true;
    this.warehouseReorderService
      .createReorderRule(this.ruleForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rule) => {
          this.toast.success('Reorder rule created successfully');
          this.loadReorderRules();
          this.closeCreateRuleModal();
          this.isCreatingRule = false;
        },
        error: (error) => {
          console.error('Error creating reorder rule:', error);
          this.toast.error('Failed to create reorder rule');
          this.isCreatingRule = false;
        },
      });
  }

  validateRuleForm(): boolean {
    if (!this.ruleForm.productId) {
      this.toast.error('Please select a product');
      return false;
    }
    if (this.ruleForm.reorderQuantity <= 0) {
      this.toast.error('Reorder quantity must be greater than 0');
      return false;
    }
    if (this.ruleForm.minStock < 0) {
      this.toast.error('Minimum stock level cannot be negative');
      return false;
    }
    if (this.ruleForm.maxStock <= this.ruleForm.minStock) {
      this.toast.error(
        'Maximum stock level must be greater than minimum stock level',
      );
      return false;
    }
    return true;
  }

  // Edit Reorder Rule
  openEditRuleModal(rule: ReorderRule): void {
    this.selectedRule = rule;
    this.ruleForm = {
      productId: rule.productId,
      minStock: rule.minStock,
      maxStock: rule.maxStock,
      reorderQuantity: rule.reorderQuantity,
      leadTimeDays: rule.leadTimeDays,
      supplierId: rule.supplierId,
    };
    this.showEditRuleModal = true;
  }

  closeEditRuleModal(): void {
    this.showEditRuleModal = false;
    this.selectedRule = null;
  }

  updateReorderRule(): void {
    if (!this.selectedRule || !this.validateRuleForm()) {
      return;
    }

    const updateData: UpdateReorderRuleDto = {
      minStock: this.ruleForm.minStock,
      maxStock: this.ruleForm.maxStock,
      reorderQuantity: this.ruleForm.reorderQuantity,
      leadTimeDays: this.ruleForm.leadTimeDays,
      supplierId: this.ruleForm.supplierId,
    };

    this.warehouseReorderService
      .updateReorderRule(this.selectedRule.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Reorder rule updated successfully');
          this.loadReorderRules();
          this.closeEditRuleModal();
        },
        error: (error) => {
          console.error('Error updating reorder rule:', error);
          this.toast.error('Failed to update reorder rule');
        },
      });
  }

  toggleRuleStatus(rule: ReorderRule): void {
    const updateData: UpdateReorderRuleDto = {
      enabled: !rule.enabled,
    };

    this.warehouseReorderService
      .updateReorderRule(rule.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(
            `Reorder rule ${!rule.enabled ? 'activated' : 'deactivated'}`,
          );
          this.loadReorderRules();
        },
        error: (error) => {
          console.error('Error toggling rule status:', error);
          this.toast.error('Failed to update rule status');
        },
      });
  }

  deleteReorderRule(ruleId: number): void {
    if (!confirm('Are you sure you want to delete this reorder rule?')) {
      return;
    }

    this.warehouseReorderService
      .deleteReorderRule(ruleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Reorder rule deleted successfully');
          this.loadReorderRules();
        },
        error: (error) => {
          console.error('Error deleting reorder rule:', error);
          this.toast.error('Failed to delete reorder rule');
        },
      });
  }

  // Alert Details
  viewAlertDetails(alert: ReorderAlert): void {
    this.selectedAlert = alert;
    this.showAlertDetailsModal = true;
  }

  closeAlertDetailsModal(): void {
    this.showAlertDetailsModal = false;
    this.selectedAlert = null;
  }

  // Trigger Reorder Check
  triggerReorderCheck(): void {
    this.isTriggeringCheck = true;

    this.warehouseReorderService
      .triggerReorderCheck()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toast.success(
            `Triggered ${result.triggered_rules} reorder rules`,
          );
          this.loadReorderAlerts();
          this.isTriggeringCheck = false;
        },
        error: (error) => {
          console.error('Error triggering reorder check:', error);
          this.toast.error('Failed to trigger reorder check');
          this.isTriggeringCheck = false;
        },
      });
  }

  // Utility Methods
  getAlertUrgencyColor(urgency: string): string {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-orange-100 text-orange-800 border-orange-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getAlertUrgencyIcon(urgency: string): string {
    const icons: Record<string, string> = {
      critical:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      warning:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return icons[urgency] || icons['info'];
  }

  getProductName(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    return product?.name || `Product #${productId}`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  calculateRecommendedReorderPoint(): void {
    // Simple calculation based on product selection
    const selectedProduct = this.products.find(
      (p) => p.id === this.ruleForm.productId,
    );
    if (selectedProduct && selectedProduct.current_stock) {
      const dailyConsumption = 5; // This should be calculated from actual data
      const leadTime = this.ruleForm.leadTimeDays || 7;
      const safetyDays = 7;

      const reorderPoint = this.warehouseReorderService.calculateReorderPoint(
        dailyConsumption,
        leadTime,
        safetyDays,
      );

      this.ruleForm.minStock = reorderPoint;

      this.ruleForm.reorderQuantity =
        this.warehouseReorderService.calculateReorderQuantity(
          dailyConsumption,
          leadTime,
          1.5,
        );
    }
  }

  refreshData(): void {
    this.loadData();
  }

  trackByAlertId(index: number, alert: ReorderAlert): number {
    return alert.product_id;
  }

  trackByRuleId(index: number, rule: ReorderRule): number {
    return rule.id;
  }
}
