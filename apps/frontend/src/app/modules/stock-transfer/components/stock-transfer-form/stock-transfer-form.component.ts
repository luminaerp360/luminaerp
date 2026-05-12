import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { StockTransferService } from '../../services/stock-transfer.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { MultiOrganizationService } from '../../../../shared/Services/multi-organization.service';
import { LocalStorageService } from '../../../../shared/Services/local-storage.service';
import { Product } from '../../../../shared/interfaces/products';
import { UserOrganization } from '../../../../shared/interfaces/user-organization.interface';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';
import {
  Organization,
  CreateStockTransferDto,
  StockTransferItem,
} from '../../interfaces/stock-tranfer.interface';

@Component({
  selector: 'app-stock-transfer-form',
  templateUrl: './stock-transfer-form.component.html',
  styleUrl: './stock-transfer-form.component.scss',
})
export class StockTransferFormComponent
  extends ModalComponent
  implements OnInit
{
  transferForm: FormGroup;
  organizations: Organization[] = [];
  userOrganizations: UserOrganization[] = [];
  currentOrgId: number | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading = false;
  searchQuery = '';

  constructor(
    private fb: FormBuilder,
    private stockTransferService: StockTransferService,
    private productService: ProductService,
    private multiOrgService: MultiOrganizationService,
    private localStorageService: LocalStorageService
  ) {
    super();
    console.log('StockTransferFormComponent constructor called');
    this.transferForm = this.createTransferForm();
    console.log('Form created:', this.transferForm);
    console.log('Items FormArray:', this.itemsFormArray);
    console.log('Items FormArray length:', this.itemsFormArray.length);
  }

  ngOnInit() {
    console.log('StockTransferFormComponent ngOnInit called');
    this.loadUserOrganizations();
    this.loadProducts();
  }

  createTransferForm(): FormGroup {
    return this.fb.group({
      fromOrganizationId: [{ value: '', disabled: true }, Validators.required],
      toOrganizationId: ['', Validators.required],
      fromLocationId: [''],
      toLocationId: [''],
      notes: [''],
      items: this.fb.array([this.createItemForm()], Validators.required),
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
    const items = this.transferForm.get('items') as FormArray;
    if (!items) {
      console.error('Items FormArray not found');
      return this.fb.array([]);
    }
    return items;
  }

  loadUserOrganizations() {
    // Get current user from localStorage the same way as organization switcher
    const currentUser = this.localStorageService.getItem(
      'user',
      true
    ) as UserInterface;

    if (!currentUser?.id) {
      console.error('No current user found in localStorage');
      return;
    }

    // Get current org ID
    this.currentOrgId = this.multiOrgService.getCurrentOrgId();
    console.log('Current org ID:', this.currentOrgId);
    console.log('Loading organizations for user:', currentUser.id);

    this.multiOrgService.getUserOrganizations(currentUser.id).subscribe({
      next: (orgs) => {
        console.log('Received user organizations:', orgs);
        console.log('Number of organizations:', orgs.length);
        console.log('Organization details:', JSON.stringify(orgs, null, 2));
        this.userOrganizations = orgs;

        // Log the userOrganizations after assignment
        console.log(
          'this.userOrganizations after assignment:',
          this.userOrganizations
        );

        // Find the current organization from the user's organizations
        // If currentOrgId doesn't exist in user orgs, use the first available org
        const currentOrg = orgs.find((org) => org.id === this.currentOrgId);
        if (currentOrg) {
          console.log('Found current org in user organizations:', currentOrg);
          this.transferForm
            .get('fromOrganizationId')
            ?.setValue(this.currentOrgId);
        } else if (orgs.length > 0) {
          // Use the first organization if current org not found
          console.log(
            'Current org not found, using first available org:',
            orgs[0]
          );
          this.currentOrgId = orgs[0].id;
          this.transferForm.get('fromOrganizationId')?.setValue(orgs[0].id);
        } else {
          console.warn('No organizations available for user');
        }
      },
      error: (error) => {
        console.error('Error loading user organizations:', error);
        // Fallback to the original method if multi-org fails
        // this.loadOrganizations();
      },
    });
  }

  // loadOrganizations() {
  //   this.stockTransferService.getAvailableOrganizations().subscribe({
  //     next: (organizations) => {
  //       this.organizations = organizations;
  //     },
  //     error: (error) => {
  //       console.error('Error loading organizations:', error);
  //     },
  //   });
  // }

  loadProducts() {
    this.loading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading = false;
      },
    });
  }

  searchProducts() {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = this.products;
      return;
    }

    this.filteredProducts = this.products.filter(
      (product) =>
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.productIdNumber
          ?.toLowerCase()
          .includes(this.searchQuery.toLowerCase())
    );
  }

  selectProduct(product: Product, index?: number) {
    // If no specific index is provided, add to the last item or create a new one
    if (index === undefined) {
      // Check if the last item is empty, if so use it, otherwise create a new one
      const lastIndex = this.itemsFormArray.length - 1;
      const lastItem = this.itemsFormArray.at(lastIndex);

      if (!lastItem.get('productIdNumber')?.value) {
        // Last item is empty, use it
        index = lastIndex;
      } else {
        // Last item has data, create a new one
        this.addItem();
        index = this.itemsFormArray.length - 1;
      }
    }

    const item = this.itemsFormArray.at(index);
    // Use buying price, fallback to buyingPrice or buying_price property, default to 0
    const buyingPrice = product.buyingPrice || product.buying_price || 0;
    item.patchValue({
      productIdNumber: product.productIdNumber,
      productName: product.name,
      unitPrice: buyingPrice,
    });
    this.calculateTotalPrice(index);

    // Clear search after selection
    this.searchQuery = '';
    this.searchProducts();

    console.log('Product selected:', product.name, 'for item index:', index);
  }

  addItem() {
    this.itemsFormArray.push(this.createItemForm());
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  calculateTotalPrice(index: number) {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const totalPrice = quantity * unitPrice;
    item.get('totalPrice')?.setValue(totalPrice);
  }

  // Called from the input event on the quantity input
  onQuantityInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value) || value < 1) {
      value = 1;
    }
    this.updateQuantity(index, 0, value);
  }

  // updateQuantity supports relative changes (delta) or absolute set via newValue
  updateQuantity(index: number, delta: number, newValue?: number) {
    const item = this.itemsFormArray.at(index);
    if (!item) return;

    let current = Number(item.get('quantity')?.value) || 0;
    if (typeof newValue === 'number') {
      current = newValue;
    } else {
      current = current + delta;
    }

    if (current < 1) current = 1;

    item.get('quantity')?.setValue(current);
    // Recalculate total for this item
    this.calculateTotalPrice(index);
  }

  getTotalTransferValue(): number {
    return this.itemsFormArray.controls.reduce((total, item) => {
      return total + (item.get('totalPrice')?.value || 0);
    }, 0);
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
    // First check if the basic form structure is valid (excluding disabled controls)
    console.log('Form validity check:');
    console.log('transferForm.valid:', this.transferForm.valid);
    console.log('transferForm.errors:', this.transferForm.errors);
    console.log('Items array length:', this.itemsFormArray.length);
    console.log('Items array validity:', this.itemsFormArray.valid);

    // Manually check if all required fields are filled
    const fromOrgId = this.transferForm.get('fromOrganizationId')?.value;
    const toOrgId = this.transferForm.get('toOrganizationId')?.value;

    console.log('From org ID:', fromOrgId);
    console.log('To org ID:', toOrgId);

    if (!fromOrgId) {
      console.error('From organization is required');
      return;
    }

    if (!toOrgId) {
      console.error('To organization is required');
      this.transferForm.get('toOrganizationId')?.markAsTouched();
      return;
    }

    if (this.itemsFormArray.length === 0) {
      console.error('At least one item is required');
      return;
    }

    // Check each item in the array
    let hasValidItems = false;
    for (let i = 0; i < this.itemsFormArray.length; i++) {
      const item = this.itemsFormArray.at(i);
      const productId = item.get('productIdNumber')?.value;
      const productName = item.get('productName')?.value;
      const quantity = item.get('quantity')?.value;

      if (productId && productName && quantity > 0) {
        hasValidItems = true;
        break;
      }
    }

    if (!hasValidItems) {
      console.error(
        'At least one valid item with product and quantity is required'
      );
      this.itemsFormArray.markAllAsTouched();
      return;
    }

    this.loading = true;

    // Enable the fromOrganizationId field temporarily to include it in form value
    this.transferForm.get('fromOrganizationId')?.enable();
    const transferData: CreateStockTransferDto = this.transferForm.value;
    this.transferForm.get('fromOrganizationId')?.disable();

    console.log('Submitting transfer data:', transferData);

    this.stockTransferService.createStockTransfer(transferData).subscribe({
      next: (response) => {
        console.log('Transfer created successfully:', response);
        this.resetForm();
        this.close(true); // Close modal and indicate success
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating transfer:', error);
        this.loading = false;
      },
    });
  }

  override close(result?: any) {
    super.close(result);
  }

  resetForm() {
    this.transferForm.reset();
    // Reset items array to have just one item
    while (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(this.itemsFormArray.length - 1);
    }
    // Reset the first item
    this.itemsFormArray.at(0).reset();
  }
}
