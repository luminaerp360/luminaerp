import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ProductService } from '../../../../shared/Services/product.service';
import { Product } from '../../../../shared/interfaces/products';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-add-inventory',
  templateUrl: './add-inventory.component.html',
  styleUrls: ['./add-inventory.component.scss'],
})
export class AddInventoryComponent implements OnInit, OnDestroy {
  purchaseForm: FormGroup;
  products: Product[] = [];
  suppliers: Supplier[] = [];
  isSubmitting = false;
  loadingProducts = false;
  loadingSuppliers = false;
  isEditMode = false;
  editPurchaseId: number | null = null;
  loadingPurchase = false;

  paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'MPESA', label: 'M-Pesa' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CREDIT', label: 'Credit' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private inventoryService: InventoryService,
    private suppliersService: SuppliersService,
    private toast: HotToastService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.purchaseForm = this.fb.group({
      supplierId: [null, Validators.required],
      notes: [''],
      items: this.fb.array([], Validators.required),
      payments: this.fb.array([]),
      subtotal: [0],
      totalAmount: [0],
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadSuppliers();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editPurchaseId = +id;
      this.loadPurchaseForEdit(this.editPurchaseId);
    } else {
      this.addItem();
    }

    this.itemsArray.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotals());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get itemsArray(): FormArray {
    return this.purchaseForm.get('items') as FormArray;
  }

  get paymentsArray(): FormArray {
    return this.purchaseForm.get('payments') as FormArray;
  }

  loadProducts() {
    this.loadingProducts = true;
    this.productService
      .getAllProducts()
      .pipe(finalize(() => (this.loadingProducts = false)))
      .subscribe({
        next: (products) => {
          this.products = products.filter((p) => !p.isService);
        },
        error: () => this.toast.error('Failed to load products'),
      });
  }

  loadSuppliers() {
    this.loadingSuppliers = true;
    this.suppliersService
      .getAllSupplier()
      .pipe(finalize(() => (this.loadingSuppliers = false)))
      .subscribe({
        next: (suppliers) => (this.suppliers = suppliers),
        error: () => this.toast.error('Failed to load suppliers'),
      });
  }

  loadPurchaseForEdit(id: number) {
    this.loadingPurchase = true;
    this.inventoryService
      .getInventorybyId(id.toString())
      .pipe(finalize(() => (this.loadingPurchase = false)))
      .subscribe({
        next: (purchase: any) => {
          // Set supplier
          this.purchaseForm.patchValue(
            {
              supplierId: purchase.supplierId,
              notes: purchase.notes || '',
            },
            { emitEvent: false },
          );

          // Parse and populate items
          let items = purchase.items;
          if (typeof items === 'string') {
            try {
              items = JSON.parse(items);
            } catch {
              items = [];
            }
          }

          // Clear default items and add purchase items
          this.itemsArray.clear();
          for (const item of items) {
            this.addItem();
            const lastIndex = this.itemsArray.length - 1;
            const itemForm = this.itemsArray.at(lastIndex) as FormGroup;
            itemForm.patchValue(
              {
                productId: Number(item.product_id),
                quantity: item.quantity,
                buying_price: item.buying_price,
                markup_percentage: item.markup_percentage || 0,
                selling_price: item.selling_price || 0,
                unit: item.unit || 'pcs',
                unit_identifiers: Array.isArray(item.unit_identifiers)
                  ? item.unit_identifiers.join('\n')
                  : '',
                expiry_date: item.expiry_date || null,
                manufacture_date: item.manufacture_date || null,
                warehouse_location: item.warehouse_location || '',
                notes: item.notes || '',
              },
              { emitEvent: false },
            );
            this.calculateItemTotal(itemForm);
          }

          // Populate payments
          if (purchase.payments && Array.isArray(purchase.payments)) {
            this.paymentsArray.clear();
            for (const payment of purchase.payments) {
              this.addPayment();
              const lastIdx = this.paymentsArray.length - 1;
              const paymentForm = this.paymentsArray.at(lastIdx) as FormGroup;
              paymentForm.patchValue(
                {
                  amount: payment.amount,
                  method: payment.method,
                },
                { emitEvent: false },
              );
            }
          }

          this.calculateTotals();
        },
        error: (error) => {
          console.error('Error loading purchase:', error);
          this.toast.error('Failed to load purchase for editing');
          this.router.navigate(['/purchases']);
        },
      });
  }

  addItem() {
    const itemForm = this.fb.group({
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      buying_price: [0, [Validators.required, Validators.min(0)]],
      markup_percentage: [0, [Validators.min(0)]],
      selling_price: [0, [Validators.min(0)]],
      unit: ['pcs'],
      unit_identifiers: [''],
      expiry_date: [null],
      manufacture_date: [null],
      warehouse_location: [''],
      notes: [''],
      total: [0],
    });

    // When product changes, auto-fill buying price and selling price
    itemForm
      .get('productId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((productId) => {
        const product = this.products.find((p) => p.id === productId);
        if (product) {
          const buyingPrice = product.buying_price || product.buyingPrice || 0;
          const sellingPrice = product.price || 0;
          let markup = 0;
          if (buyingPrice > 0 && sellingPrice > 0) {
            markup =
              Math.round(
                ((sellingPrice - buyingPrice) / buyingPrice) * 100 * 100,
              ) / 100;
          }
          itemForm.patchValue(
            {
              buying_price: buyingPrice,
              selling_price: sellingPrice,
              markup_percentage: markup > 0 ? markup : 0,
            },
            { emitEvent: false },
          );
          this.calculateItemTotal(itemForm);
        }
      });

    // Recalculate on quantity / price changes
    itemForm
      .get('quantity')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateItemTotal(itemForm));

    itemForm
      .get('buying_price')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateSellingPriceFromMarkup(itemForm);
        this.calculateItemTotal(itemForm);
      });

    // When markup changes, recalculate selling price
    itemForm
      .get('markup_percentage')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateSellingPriceFromMarkup(itemForm));

    // When selling price changes manually, recalculate markup
    itemForm
      .get('selling_price')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateMarkupFromSellingPrice(itemForm));

    this.itemsArray.push(itemForm);
    this.calculateTotals();
  }

  removeItem(index: number) {
    this.itemsArray.removeAt(index);
    this.calculateTotals();
  }

  private _updatingPrices = false;

  updateSellingPriceFromMarkup(itemForm: FormGroup) {
    if (this._updatingPrices) return;
    this._updatingPrices = true;
    const buyingPrice = itemForm.get('buying_price')?.value || 0;
    const markup = itemForm.get('markup_percentage')?.value || 0;
    if (buyingPrice > 0 && markup > 0) {
      const sellingPrice =
        Math.round(buyingPrice * (1 + markup / 100) * 100) / 100;
      itemForm.patchValue(
        { selling_price: sellingPrice },
        { emitEvent: false },
      );
    }
    this._updatingPrices = false;
  }

  updateMarkupFromSellingPrice(itemForm: FormGroup) {
    if (this._updatingPrices) return;
    this._updatingPrices = true;
    const buyingPrice = itemForm.get('buying_price')?.value || 0;
    const sellingPrice = itemForm.get('selling_price')?.value || 0;
    if (buyingPrice > 0 && sellingPrice > 0) {
      const markup =
        Math.round(((sellingPrice - buyingPrice) / buyingPrice) * 100 * 100) /
        100;
      itemForm.patchValue({ markup_percentage: markup }, { emitEvent: false });
    }
    this._updatingPrices = false;
  }

  calculateItemTotal(itemForm: FormGroup) {
    const quantity = itemForm.get('quantity')?.value || 0;
    const buyingPrice = itemForm.get('buying_price')?.value || 0;
    const total = quantity * buyingPrice;
    itemForm.patchValue({ total: Math.max(0, total) }, { emitEvent: false });
    this.calculateTotals();
  }

  calculateTotals() {
    let subtotal = 0;
    for (const item of this.itemsArray.controls) {
      const quantity = item.get('quantity')?.value || 0;
      const buyingPrice = item.get('buying_price')?.value || 0;
      subtotal += quantity * buyingPrice;
    }

    this.purchaseForm.patchValue(
      {
        subtotal: Math.max(0, subtotal),
        totalAmount: Math.max(0, subtotal),
      },
      { emitEvent: false },
    );
  }

  addPayment() {
    const paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0)]],
      method: ['CASH', Validators.required],
    });
    this.paymentsArray.push(paymentForm);
  }

  removePayment(index: number) {
    this.paymentsArray.removeAt(index);
  }

  getTotalPaid(): number {
    return this.paymentsArray.controls.reduce(
      (total, ctrl) => total + (ctrl.get('amount')?.value || 0),
      0,
    );
  }

  getBalance(): number {
    return (
      (this.purchaseForm.get('totalAmount')?.value || 0) - this.getTotalPaid()
    );
  }

  getCurrentUser(): string {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user).username || 'admin';
      } catch {
        return 'admin';
      }
    }
    return 'admin';
  }

  getProductForItem(itemForm: FormGroup): Product | undefined {
    const productId = itemForm.get('productId')?.value;
    return this.products.find((p) => p.id === productId);
  }

  isTrackedProductAt(index: number): boolean {
    const itemForm = this.itemsArray.at(index) as FormGroup;
    const product = this.getProductForItem(itemForm);
    return ['SERIAL', 'IMEI', 'REGISTRATION'].includes(
      product?.trackingMode || 'NONE',
    );
  }

  isBatchTrackedProductAt(index: number): boolean {
    const itemForm = this.itemsArray.at(index) as FormGroup;
    const product = this.getProductForItem(itemForm);
    return !!product?.batchTracking;
  }

  getTrackingLabelAt(index: number): string {
    const itemForm = this.itemsArray.at(index) as FormGroup;
    const product = this.getProductForItem(itemForm);

    if (product?.trackingMode === 'IMEI') {
      return 'IMEI';
    }

    if (product?.trackingMode === 'REGISTRATION') {
      return 'Registration Number';
    }

    if (product?.trackingMode === 'SERIAL') {
      return 'Serial Number';
    }

    return 'Identifier';
  }

  parseUnitIdentifiers(rawValue: string): string[] {
    return String(rawValue || '')
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  getIdentifierCountAt(index: number): number {
    const itemForm = this.itemsArray.at(index) as FormGroup;
    return this.parseUnitIdentifiers(
      itemForm.get('unit_identifiers')?.value || '',
    ).length;
  }

  private validateTrackedItems(): boolean {
    for (let i = 0; i < this.itemsArray.length; i++) {
      if (!this.isTrackedProductAt(i)) {
        continue;
      }

      const item = this.itemsArray.at(i);
      const identifiers = this.parseUnitIdentifiers(
        item.get('unit_identifiers')?.value || '',
      );

      // At creation time, identifiers are optional — they can be entered at receive time
      if (identifiers.length === 0) {
        continue;
      }

      const quantity = Number(item.get('quantity')?.value || 0);

      if (identifiers.length !== quantity) {
        this.toast.error(
          `Item #${i + 1}: you entered ${identifiers.length} identifiers but quantity is ${quantity}. Either enter exactly ${quantity} or leave blank to enter at receive time.`,
        );
        return false;
      }

      const duplicates = identifiers.filter(
        (value, index) => identifiers.indexOf(value) !== index,
      );
      if (duplicates.length > 0) {
        this.toast.error(
          `Item #${i + 1}: duplicate identifiers found (${[...new Set(duplicates)].join(', ')}).`,
        );
        return false;
      }
    }

    return true;
  }

  onSubmit() {
    if (this.isSubmitting) return;

    // Validate supplier
    if (!this.purchaseForm.get('supplierId')?.value) {
      this.toast.error('Please select a supplier');
      return;
    }

    // Validate items
    if (this.itemsArray.length === 0) {
      this.toast.error('Please add at least one item');
      return;
    }

    // Validate each item has a product
    for (let i = 0; i < this.itemsArray.length; i++) {
      const item = this.itemsArray.at(i);
      if (!item.get('productId')?.value) {
        this.toast.error(`Please select a product for item #${i + 1}`);
        return;
      }
      if (!item.get('quantity')?.value || item.get('quantity')?.value < 1) {
        this.toast.error(`Please enter a valid quantity for item #${i + 1}`);
        return;
      }
    }

    if (!this.validateTrackedItems()) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.purchaseForm.value;

    const purchaseData = {
      items: formValue.items.map((item: any) => ({
        product_id: item.productId.toString(),
        quantity: item.quantity,
        buying_price: item.buying_price,
        markup_percentage: item.markup_percentage || 0,
        selling_price: item.selling_price || 0,
        unit: item.unit,
        unit_identifiers: this.parseUnitIdentifiers(item.unit_identifiers),
        expiry_date: item.expiry_date || null,
        manufacture_date: item.manufacture_date || null,
        warehouse_location: item.warehouse_location || '',
        notes: item.notes || '',
      })),
      supplierId: +formValue.supplierId,
      added_by: this.getCurrentUser(),
      deleted: false,
      payments: formValue.payments.map((p: any) => ({
        amount: p.amount,
        method: p.method,
      })),
      notes: formValue.notes || '',
    };

    const request$ = this.isEditMode
      ? this.inventoryService.updateInventory(
          this.editPurchaseId!.toString(),
          purchaseData,
        )
      : this.inventoryService.addInventory(purchaseData);

    request$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toast.success(
          this.isEditMode
            ? 'Purchase updated successfully'
            : 'Purchase recorded successfully',
        );
        this.router.navigate(['/purchases']);
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} purchase:`,
          error,
        );
        this.toast.error(
          error.error?.message ||
            `Failed to ${this.isEditMode ? 'update' : 'create'} purchase`,
        );
      },
    });
  }

  goBack() {
    this.router.navigate([this.isEditMode ? '/purchases' : '/purchases']);
  }
}
