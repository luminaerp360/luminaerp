import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../../shared/Services/product.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { MultiOrganizationService } from '../../../../shared/Services/multi-organization.service';
import { LocalStorageService } from '../../../../shared/Services/local-storage.service';
import { Router } from '@angular/router';
import { Product } from '../../../../shared/interfaces/products';
import { UserOrganization } from '../../../../shared/interfaces/user-organization.interface';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';
import { CreateStockTransferDto } from '../../interfaces/stock-tranfer.interface';

@Component({
  selector: 'app-create-stock-transfer',
  templateUrl: './create-stock-transfer.component.html',
  styleUrl: './create-stock-transfer.component.scss',
})
export class CreateStockTransferComponent implements OnInit {
  transferForm: FormGroup;
  userOrganizations: UserOrganization[] = [];
  currentOrgId: number | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery = '';
  loading = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private stockTransferService: StockTransferService,
    private multiOrgService: MultiOrganizationService,
    private localStorageService: LocalStorageService,
    private router: Router
  ) {
    this.transferForm = this.createTransferForm();
  }

  ngOnInit(): void {
    this.loadUserOrganizations();
    this.loadProducts();
  }

  createTransferForm(): FormGroup {
    return this.fb.group({
      fromOrganizationId: [{ value: '', disabled: true }, Validators.required],
      toOrganizationId: ['', Validators.required],
      notes: [''],
      items: this.fb.array([], Validators.required),
    });
  }

  createItemForm(): FormGroup {
    return this.fb.group({
      productIdNumber: ['', Validators.required],
      productName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
    });
  }

  get itemsFormArray(): FormArray {
    return this.transferForm.get('items') as FormArray;
  }

  loadUserOrganizations() {
    const currentUser = this.localStorageService.getItem(
      'user',
      true
    ) as UserInterface;
    if (!currentUser?.id) return;

    this.currentOrgId = this.multiOrgService.getCurrentOrgId();
    this.multiOrgService.getUserOrganizations(currentUser.id).subscribe({
      next: (orgs) => {
        this.userOrganizations = orgs;
        const currentOrg = orgs.find((o) => o.id === this.currentOrgId);
        if (currentOrg) {
          this.transferForm
            .get('fromOrganizationId')
            ?.setValue(this.currentOrgId);
        } else if (orgs.length) {
          this.currentOrgId = orgs[0].id;
          this.transferForm
            .get('fromOrganizationId')
            ?.setValue(this.currentOrgId);
        }
      },
      error: (err) => console.error('Error loading organizations', err),
    });
  }

  loadProducts() {
    this.loading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.loading = false;
      },
    });
  }

  searchProducts() {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = this.products;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.productIdNumber?.toLowerCase().includes(q)
    );
  }

  addProductToTransfer(product: Product) {
    // If product already added, optionally increment quantity
    const existingIndex = this.itemsFormArray.controls.findIndex(
      (c) => c.get('productIdNumber')?.value === product.productIdNumber
    );
    if (existingIndex !== -1) {
      this.updateQuantity(existingIndex, 1);
      return;
    }

    const group = this.createItemForm();
    const buyingPrice =
      product.buyingPrice || (product as any).buying_price || 0;
    group.patchValue({
      productIdNumber: product.productIdNumber,
      productName: product.name,
      unitPrice: buyingPrice,
      totalPrice: buyingPrice,
    });
    this.itemsFormArray.push(group);
    this.calculateTotalPrice(this.itemsFormArray.length - 1);
  }

  removeItem(i: number) {
    this.itemsFormArray.removeAt(i);
  }

  updateQuantity(index: number, delta: number, newValue?: number) {
    const item = this.itemsFormArray.at(index);
    if (!item) return;
    let current = Number(item.get('quantity')?.value) || 0;
    if (typeof newValue === 'number') current = newValue;
    else current += delta;
    if (current < 1) current = 1;
    item.get('quantity')?.setValue(current);
    this.calculateTotalPrice(index);
  }

  onQuantityInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value) || value < 1) value = 1;
    this.updateQuantity(index, 0, value);
  }

  calculateTotalPrice(index: number) {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const totalPrice = quantity * unitPrice;
    item.get('totalPrice')?.setValue(totalPrice);
  }

  getTotalTransferValue(): number {
    return this.itemsFormArray.controls.reduce(
      (total, item) => total + (item.get('totalPrice')?.value || 0),
      0
    );
  }

  getValidItemsCount(): number {
    return this.itemsFormArray.controls.filter((item) => {
      const productId = item.get('productIdNumber')?.value;
      const productName = item.get('productName')?.value;
      const quantity = item.get('quantity')?.value;
      return productId && productName && quantity > 0;
    }).length;
  }

  submit() {
    if (this.submitting) return;

    const fromOrgId = this.transferForm.get('fromOrganizationId')?.value;
    const toOrgId = this.transferForm.get('toOrganizationId')?.value;

    if (!fromOrgId || !toOrgId || !this.getValidItemsCount()) {
      this.transferForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.transferForm.get('fromOrganizationId')?.enable();
    const payload: CreateStockTransferDto = this.transferForm.value;
    this.transferForm.get('fromOrganizationId')?.disable();

    this.stockTransferService.createStockTransfer(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/stock-transfer']);
      },
      error: (err) => {
        console.error('Create transfer failed', err);
        this.submitting = false;
      },
    });
  }
}
