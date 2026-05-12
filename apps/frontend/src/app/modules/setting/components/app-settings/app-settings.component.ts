import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SettingsService } from '../../../../shared/Services/settings.service';
import { PaymentMethodService } from '../../../../shared/Services/payment-method.service';
import { HotToastService } from '@ngneat/hot-toast';
import {
  OrganizationSettings,
  ViewMode,
} from '../../../../shared/interfaces/settings.interface';
import {
  PaymentMethodConfig,
  CreatePaymentMethodDto,
} from '../../../../shared/interfaces/payment-method.interface';

@Component({
  selector: 'app-app-settings',
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss'],
})
export class AppSettingsComponent implements OnInit {
  activeTab: string = 'payment';
  isLoading = false;
  isSaving = false;
  settings: OrganizationSettings | null = null;

  /** Which document settings modal is open: 'invoice' | 'quotation' | 'sale' | null */
  docSettingsOpen: 'invoice' | 'quotation' | 'sale' | null = null;

  // Forms for each section
  paymentForm!: FormGroup;
  taxForm!: FormGroup;
  generalForm!: FormGroup;
  prefixesForm!: FormGroup;
  displayForm!: FormGroup;
  reportingForm!: FormGroup;
  recurringForm!: FormGroup;
  inventoryForm!: FormGroup;
  notificationsForm!: FormGroup;
  receiptForm!: FormGroup;
  businessForm!: FormGroup;
  paymentMethodsForm!: FormGroup;
  authenticationForm!: FormGroup;

  // Payment Methods Management
  paymentMethods: PaymentMethodConfig[] = [];
  isLoadingPaymentMethods = false;
  showPaymentMethodModal = false;
  editingPaymentMethod: PaymentMethodConfig | null = null;
  organizationId: number = 0;

  // Options
  viewModeOptions = [
    { value: ViewMode.LIST, label: 'List View', icon: 'list' },
    { value: ViewMode.GRID, label: 'Grid View', icon: 'grid' },
    { value: ViewMode.CARDS, label: 'Cards View', icon: 'cards' },
  ];

  monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  currencyOptions = [
    { value: 'KES', label: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  ];

  dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: '31/12/2026' },
    { value: 'MM/DD/YYYY', label: '12/31/2026' },
    { value: 'YYYY-MM-DD', label: '2026-12-31' },
    { value: 'DD MMM YYYY', label: '31 Dec 2026' },
  ];

  timeFormatOptions = [
    { value: 'HH:mm', label: '24-hour (14:30)' },
    { value: 'hh:mm A', label: '12-hour (02:30 PM)' },
  ];

  timeZoneOptions = [
    { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'British Time (GMT)' },
  ];

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private paymentMethodService: PaymentMethodService,
    private toast: HotToastService,
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadOrganizationId();
    this.loadPaymentMethods();
  }

  loadOrganizationId(): void {
    const currentOrgStr = localStorage.getItem('currentOrganization');
    if (currentOrgStr) {
      const currentOrg = JSON.parse(currentOrgStr);
      this.organizationId = currentOrg?.id || 0;
    }
  }

  initializeForms(): void {
    // Payment Methods Form
    this.paymentForm = this.fb.group({
      cash: [true],
      mpesa: [true],
      bank: [true],
      credit: [true],
    });

    // Tax Settings Form
    this.taxForm = this.fb.group({
      enableTax: [true],
      defaultTaxRate: [16, [Validators.min(0), Validators.max(100)]],
      taxName: ['VAT', Validators.required],
      taxNumber: [''],
      includeTaxInPrice: [false],
    });

    // General Settings Form
    this.generalForm = this.fb.group({
      currency: ['KES', Validators.required],
      currencySymbol: ['KSh', Validators.required],
      timeZone: ['Africa/Nairobi', Validators.required],
      dateFormat: ['DD/MM/YYYY', Validators.required],
      timeFormat: ['HH:mm', Validators.required],
      decimalPlaces: [
        2,
        [Validators.required, Validators.min(0), Validators.max(4)],
      ],
    });

    // Prefixes Form
    this.prefixesForm = this.fb.group({
      invoicePrefix: ['INV', Validators.required],
      salePrefix: ['SALE', Validators.required],
      quotationPrefix: ['QUO', Validators.required],
      lpoPrefix: ['LPO', Validators.required],
      paymentPrefix: ['PAY', Validators.required],
      expensePrefix: ['EXP', Validators.required],
      creditSalePrefix: ['CS', Validators.required],
    });

    // Display Settings Form
    this.displayForm = this.fb.group({
      defaultViewMode: [ViewMode.LIST, Validators.required],
      itemsPerPage: [
        50,
        [Validators.required, Validators.min(10), Validators.max(100)],
      ],
      showProductImages: [true],
      compactMode: [false],
    });

    // Reporting Period Form
    this.reportingForm = this.fb.group({
      fiscalYearStart: [
        1,
        [Validators.required, Validators.min(1), Validators.max(12)],
      ],
      fiscalYearEnd: [
        12,
        [Validators.required, Validators.min(1), Validators.max(12)],
      ],
      reportingPeriodStart: [
        1,
        [Validators.required, Validators.min(1), Validators.max(31)],
      ],
      reportingPeriodEnd: [
        31,
        [Validators.required, Validators.min(1), Validators.max(31)],
      ],
    });

    // Recurring Invoice Form
    this.recurringForm = this.fb.group({
      recurringInvoiceTime: ['09:00', Validators.required],
      recurringInvoiceDaysBefore: [0, [Validators.min(0), Validators.max(30)]],
    });

    // Inventory Settings Form
    this.inventoryForm = this.fb.group({
      lowStockAlertEnabled: [true],
      autoDeductInventory: [true],
      allowNegativeStock: [false],
    });

    // Notifications Form
    this.notificationsForm = this.fb.group({
      emailNotifications: [true],
      smsNotifications: [false],
      lowStockNotifications: [true],
    });

    // Receipt/Invoice Form
    this.receiptForm = this.fb.group({
      showCompanyLogo: [true],
      showBankDetails: [true],
      showMpesaDetails: [true],
      receiptFooterText: [''],
      invoiceFooterText: [''],
      quotationFooterText: [''],
      invoiceTerms: [''],
      invoiceNotes: [''],
      quotationTerms: [''],
      quotationNotes: [''],
    });

    // Business Rules Form
    this.businessForm = this.fb.group({
      requireCustomerForCredit: [true],
      allowDiscounts: [true],
      maxDiscountPercentage: [100, [Validators.min(0), Validators.max(100)]],
    });

    // Payment Methods Management Form
    this.paymentMethodsForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      displayName: ['', Validators.required],
      description: [''],
      icon: [''],
      enabled: [true],
      requiresReference: [false],
      autoReconcile: [false],
      accountNumber: [''],
      providerName: [''],
    });

    // Authentication Settings Form
    this.authenticationForm = this.fb.group({
      jwtAccessTokenExpiry: ['1h', Validators.required],
      jwtRefreshTokenExpiry: ['7d', Validators.required],
      sessionTimeout: [3600, [Validators.required, Validators.min(300)]],
      maxLoginAttempts: [5, [Validators.required, Validators.min(1)]],
      lockoutDuration: [900, [Validators.required, Validators.min(60)]],
    });
  }

  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getSettings(true).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.patchForms(settings);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.toast.error('Failed to load settings');
        this.isLoading = false;
      },
    });
  }

  patchForms(settings: OrganizationSettings): void {
    // Payment Methods
    const paymentMethods = settings.paymentMethods as any;
    this.paymentForm.patchValue({
      cash: paymentMethods.cash ?? true,
      mpesa: paymentMethods.mpesa ?? true,
      bank: paymentMethods.bank ?? true,
      credit: paymentMethods.credit ?? true,
    });

    // Tax Settings
    this.taxForm.patchValue({
      enableTax: settings.enableTax,
      defaultTaxRate: settings.defaultTaxRate,
      taxName: settings.taxName,
      taxNumber: settings.taxNumber,
      includeTaxInPrice: settings.includeTaxInPrice,
    });

    // General Settings
    this.generalForm.patchValue({
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      timeZone: settings.timeZone,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      decimalPlaces: settings.decimalPlaces,
    });

    // Prefixes
    this.prefixesForm.patchValue({
      invoicePrefix: settings.invoicePrefix,
      salePrefix: settings.salePrefix,
      quotationPrefix: settings.quotationPrefix,
      lpoPrefix: settings.lpoPrefix,
      paymentPrefix: settings.paymentPrefix,
      expensePrefix: settings.expensePrefix,
      creditSalePrefix: settings.creditSalePrefix,
    });

    // Display
    this.displayForm.patchValue({
      defaultViewMode: settings.defaultViewMode,
      itemsPerPage: settings.itemsPerPage,
      showProductImages: settings.showProductImages,
      compactMode: settings.compactMode,
    });

    // Reporting
    this.reportingForm.patchValue({
      fiscalYearStart: settings.fiscalYearStart,
      fiscalYearEnd: settings.fiscalYearEnd,
      reportingPeriodStart: settings.reportingPeriodStart,
      reportingPeriodEnd: settings.reportingPeriodEnd,
    });

    // Recurring
    this.recurringForm.patchValue({
      recurringInvoiceTime: settings.recurringInvoiceTime,
      recurringInvoiceDaysBefore: settings.recurringInvoiceDaysBefore,
    });

    // Inventory
    this.inventoryForm.patchValue({
      lowStockAlertEnabled: settings.lowStockAlertEnabled,
      autoDeductInventory: settings.autoDeductInventory,
      allowNegativeStock: settings.allowNegativeStock,
    });

    // Notifications
    this.notificationsForm.patchValue({
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      lowStockNotifications: settings.lowStockNotifications,
    });

    // Receipt
    this.receiptForm.patchValue({
      showCompanyLogo: settings.showCompanyLogo,
      showBankDetails: settings.showBankDetails,
      showMpesaDetails: settings.showMpesaDetails,
      receiptFooterText: settings.receiptFooterText,
      invoiceFooterText: settings.invoiceFooterText,
      quotationFooterText: settings.quotationFooterText,
      invoiceTerms: settings.invoiceTerms,
      invoiceNotes: settings.invoiceNotes,
      quotationTerms: settings.quotationTerms,
      quotationNotes: settings.quotationNotes,
    });

    // Business Rules
    this.businessForm.patchValue({
      requireCustomerForCredit: settings.requireCustomerForCredit,
      allowDiscounts: settings.allowDiscounts,
      maxDiscountPercentage: settings.maxDiscountPercentage,
    });

    // Authentication Settings
    this.authenticationForm.patchValue({
      jwtAccessTokenExpiry: settings.jwtAccessTokenExpiry || '1h',
      jwtRefreshTokenExpiry: settings.jwtRefreshTokenExpiry || '7d',
      sessionTimeout: settings.sessionTimeout || 3600,
      maxLoginAttempts: settings.maxLoginAttempts || 5,
      lockoutDuration: settings.lockoutDuration || 900,
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  saveSettings(): void {
    const form = this.getActiveForm();
    if (!form || form.invalid) {
      this.toast.error('Please fix validation errors');
      return;
    }

    this.isSaving = true;
    const data = form.value;

    // For payment methods, convert form values to the expected structure
    let updateData: any = data;
    if (this.activeTab === 'payment') {
      updateData = {
        paymentMethods: {
          cash: data.cash,
          mpesa: data.mpesa,
          bank: data.bank,
          credit: data.credit,
        },
      };
    }

    this.settingsService
      .updateSection(this.getSectionName(), updateData)
      .subscribe({
        next: (settings) => {
          this.settings = settings;
          this.toast.success('Settings saved successfully');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving settings:', error);
          this.toast.error('Failed to save settings');
          this.isSaving = false;
        },
      });
  }

  resetSection(): void {
    if (confirm('Are you sure you want to reset this section to defaults?')) {
      this.loadSettings();
      this.toast.info('Section reset to saved values');
    }
  }

  resetAllSettings(): void {
    if (
      confirm(
        'Are you sure you want to reset ALL settings to defaults? This cannot be undone.',
      )
    ) {
      this.isSaving = true;
      this.settingsService.resetToDefaults().subscribe({
        next: (settings) => {
          this.settings = settings;
          this.patchForms(settings);
          this.toast.success('All settings reset to defaults');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error resetting settings:', error);
          this.toast.error('Failed to reset settings');
          this.isSaving = false;
        },
      });
    }
  }

  private getActiveForm(): FormGroup | null {
    const formMap: { [key: string]: FormGroup } = {
      payment: this.paymentForm,
      tax: this.taxForm,
      general: this.generalForm,
      prefixes: this.prefixesForm,
      display: this.displayForm,
      reporting: this.reportingForm,
      recurring: this.recurringForm,
      inventory: this.inventoryForm,
      notifications: this.notificationsForm,
      receipt: this.receiptForm,
      business: this.businessForm,
      authentication: this.authenticationForm,
    };
    return formMap[this.activeTab] || null;
  }

  private getSectionName(): any {
    const sectionMap: { [key: string]: string } = {
      payment: 'payment',
      tax: 'tax',
      general: 'general',
      prefixes: 'prefixes',
      display: 'display',
      reporting: 'reporting',
      recurring: 'recurring',
      inventory: 'inventory',
      notifications: 'notifications',
      receipt: 'receipt',
      business: 'business',
      authentication: 'authentication',
    };
    return sectionMap[this.activeTab];
  }

  onCurrencyChange(event: any): void {
    const selected = this.currencyOptions.find(
      (c) => c.value === event.target.value,
    );
    if (selected) {
      this.generalForm.patchValue({ currencySymbol: selected.symbol });
    }
  }

  // ========== Payment Methods Management ==========

  loadPaymentMethods(): void {
    if (!this.organizationId) return;

    this.isLoadingPaymentMethods = true;
    this.paymentMethodService.getByOrganization(this.organizationId).subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.isLoadingPaymentMethods = false;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.toast.error('Failed to load payment methods');
        this.isLoadingPaymentMethods = false;
      },
    });
  }

  openAddPaymentMethodModal(): void {
    this.editingPaymentMethod = null;
    this.paymentMethodsForm.reset({
      enabled: true,
      requiresReference: false,
      autoReconcile: false,
    });
    this.showPaymentMethodModal = true;
  }

  openEditPaymentMethodModal(method: PaymentMethodConfig): void {
    this.editingPaymentMethod = method;
    this.paymentMethodsForm.patchValue({
      name: method.name,
      code: method.code,
      displayName: method.displayName,
      description: method.description,
      icon: method.icon,
      enabled: method.enabled,
      requiresReference: method.requiresReference,
      autoReconcile: method.autoReconcile,
      accountNumber: method.accountNumber,
      providerName: method.providerName,
    });
    this.showPaymentMethodModal = true;
  }

  closePaymentMethodModal(): void {
    this.showPaymentMethodModal = false;
    this.editingPaymentMethod = null;
    this.paymentMethodsForm.reset();
    // Clear validation state
    Object.keys(this.paymentMethodsForm.controls).forEach((key) => {
      this.paymentMethodsForm.get(key)?.setErrors(null);
      this.paymentMethodsForm.get(key)?.markAsUntouched();
    });
  }

  savePaymentMethod(): void {
    if (this.paymentMethodsForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.paymentMethodsForm.controls).forEach((key) => {
        this.paymentMethodsForm.get(key)?.markAsTouched();
      });
      this.toast.error('Please fill all required fields');
      return;
    }

    if (this.editingPaymentMethod) {
      // Update existing
      this.paymentMethodService
        .update(this.editingPaymentMethod.id, this.paymentMethodsForm.value)
        .subscribe({
          next: () => {
            this.toast.success('Payment method updated successfully');
            this.closePaymentMethodModal();
            this.loadPaymentMethods();
          },
          error: (error) => {
            console.error('Error updating payment method:', error);
            this.toast.error('Failed to update payment method');
          },
        });
    } else {
      // Create new
      const dto: CreatePaymentMethodDto = {
        ...this.paymentMethodsForm.value,
        organizationId: this.organizationId,
        settingsId: this.settings?.id || 0,
        sortOrder: this.paymentMethods.length,
      };

      this.paymentMethodService.create(dto).subscribe({
        next: () => {
          this.toast.success('Payment method created successfully');
          this.closePaymentMethodModal();
          this.loadPaymentMethods();
        },
        error: (error) => {
          console.error('Error creating payment method:', error);
          this.toast.error('Failed to create payment method');
        },
      });
    }
  }

  deletePaymentMethod(method: PaymentMethodConfig): void {
    if (!confirm(`Are you sure you want to delete "${method.displayName}"?`)) {
      return;
    }

    this.paymentMethodService.delete(method.id).subscribe({
      next: () => {
        this.toast.success('Payment method deleted successfully');
        this.loadPaymentMethods();
      },
      error: (error) => {
        console.error('Error deleting payment method:', error);
        this.toast.error('Failed to delete payment method');
      },
    });
  }

  togglePaymentMethodEnabled(method: PaymentMethodConfig): void {
    this.paymentMethodService.toggleEnabled(method.id).subscribe({
      next: () => {
        this.toast.success(
          `Payment method ${method.enabled ? 'disabled' : 'enabled'} successfully`,
        );
        this.loadPaymentMethods();
      },
      error: (error) => {
        console.error('Error toggling payment method:', error);
        this.toast.error('Failed to toggle payment method');
      },
    });
  }
}
