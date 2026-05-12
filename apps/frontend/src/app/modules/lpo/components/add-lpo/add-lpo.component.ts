import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Product } from '../../../../shared/interfaces/products';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { LpoService } from '../../../../shared/Services/lpo.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { HotToastService } from '@ngneat/hot-toast';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-add-lpo',
  templateUrl: './add-lpo.component.html',
  styleUrls: ['./add-lpo.component.scss'],
})
export class AddLpoComponent implements OnInit {
  lpoForm: FormGroup;
  suppliers: Supplier[] = [];
  products: Product[] = [];
  isSubmitting = false;
  loadingSuppliers = false;
  loadingProducts = false;

  paymentTermsOptions = [
    { value: 'COD', label: 'Cash on Delivery' },
    { value: 'NET_7', label: 'Net 7 Days' },
    { value: 'NET_15', label: 'Net 15 Days' },
    { value: 'NET_30', label: 'Net 30 Days' },
    { value: 'NET_60', label: 'Net 60 Days' },
    { value: 'NET_90', label: 'Net 90 Days' },
    { value: 'PREPAID', label: 'Prepaid' },
    { value: 'ON_APPROVAL', label: 'On Approval' },
  ];

  priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'text-gray-500' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-blue-500' },
    { value: 'HIGH', label: 'High', color: 'text-orange-500' },
    { value: 'URGENT', label: 'Urgent', color: 'text-red-500' },
  ];

  constructor(
    private fb: FormBuilder,
    private lpoService: LpoService,
    private suppliersService: SuppliersService,
    private productService: ProductService,
    private toast: HotToastService,
    private router: Router,
  ) {
    this.lpoForm = this.fb.group({
      supplierId: [null, Validators.required],
      deliveryDate: [null],
      paymentTerms: ['NET_30'],
      priority: ['MEDIUM'],
      shippingAddress: [''],
      notes: [''],
      items: this.fb.array([], Validators.required),
      subtotal: [0],
      taxAmount: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      shippingCost: [0, [Validators.min(0)]],
      totalAmount: [0],
    });
  }

  ngOnInit() {
    this.loadSuppliers();
    this.loadProducts();
    this.addItem();

    this.itemsFormArray.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.lpoForm
      .get('taxAmount')
      ?.valueChanges.subscribe(() => this.calculateTotals());
    this.lpoForm
      .get('discountAmount')
      ?.valueChanges.subscribe(() => this.calculateTotals());
    this.lpoForm
      .get('shippingCost')
      ?.valueChanges.subscribe(() => this.calculateTotals());
  }

  get itemsFormArray() {
    return this.lpoForm.get('items') as FormArray;
  }

  loadSuppliers() {
    this.loadingSuppliers = true;
    this.suppliersService
      .getAllSupplier()
      .pipe(finalize(() => (this.loadingSuppliers = false)))
      .subscribe(
        (suppliers) => (this.suppliers = suppliers),
        (error) => {
          console.error('Error loading suppliers:', error);
          this.toast.error('Failed to load suppliers');
        },
      );
  }

  loadProducts() {
    this.loadingProducts = true;
    this.productService
      .getAllProducts()
      .pipe(finalize(() => (this.loadingProducts = false)))
      .subscribe(
        (products) => (this.products = products),
        (error) => {
          console.error('Error loading products:', error);
          this.toast.error('Failed to load products');
        },
      );
  }

  addItem() {
    const itemForm = this.fb.group({
      productId: [null, Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['pcs'],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      total: [0],
    });

    itemForm.get('productId')?.valueChanges.subscribe((productId) => {
      const product = this.products.find((p) => p.id === productId);
      if (product) {
        itemForm.patchValue(
          {
            unitPrice: product.buying_price,
            description: product.name,
          },
          { emitEvent: false },
        );
        this.calculateItemTotal(itemForm);
      }
    });

    itemForm
      .get('quantity')
      ?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm
      .get('unitPrice')
      ?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm
      .get('discount')
      ?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));

    this.itemsFormArray.push(itemForm);
    this.calculateTotals();
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
    this.calculateTotals();
  }

  calculateItemTotal(itemForm: FormGroup) {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const discount = itemForm.get('discount')?.value || 0;
    const total = quantity * unitPrice - discount;
    itemForm.patchValue({ total: Math.max(0, total) }, { emitEvent: false });
    this.calculateTotals();
  }

  calculateTotals() {
    let subtotal = 0;
    for (const item of this.itemsFormArray.controls) {
      const quantity = item.get('quantity')?.value || 0;
      const unitPrice = item.get('unitPrice')?.value || 0;
      const discount = item.get('discount')?.value || 0;
      subtotal += quantity * unitPrice - discount;
    }
    subtotal = Math.max(0, subtotal);

    const taxAmount = this.lpoForm.get('taxAmount')?.value || 0;
    const discountAmount = this.lpoForm.get('discountAmount')?.value || 0;
    const shippingCost = this.lpoForm.get('shippingCost')?.value || 0;
    const totalAmount = subtotal + taxAmount - discountAmount + shippingCost;

    this.lpoForm.patchValue(
      {
        subtotal,
        totalAmount: Math.max(0, totalAmount),
      },
      { emitEvent: false },
    );
  }

  getProductName(productId: number): string {
    return this.products.find((p) => p.id === productId)?.name || '';
  }

  onSubmit() {
    if (this.lpoForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.lpoForm.value;

      const lpoData = {
        supplierId: formValue.supplierId,
        items: formValue.items.map((item: any) => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        })),
        totalAmount: formValue.totalAmount,
        subtotal: formValue.subtotal,
        taxAmount: formValue.taxAmount,
        discountAmount: formValue.discountAmount,
        shippingCost: formValue.shippingCost,
        deliveryDate: formValue.deliveryDate || null,
        paymentTerms: formValue.paymentTerms,
        priority: formValue.priority,
        shippingAddress: formValue.shippingAddress,
        notes: formValue.notes,
      };

      this.lpoService
        .addLpo(lpoData)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe(
          (response) => {
            this.toast.success('Purchase order created successfully');
            this.router.navigate(['/lpo']);
          },
          (error) => {
            console.error('Error adding LPO:', error);
            this.toast.error('Failed to create purchase order');
          },
        );
    } else {
      this.markFormGroupTouched(this.lpoForm);
      this.toast.error('Please fill in all required fields');
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach((control) => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  goBack() {
    this.router.navigate(['/lpo']);
  }
}
