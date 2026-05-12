import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { StorePurchaseService } from '../../../../../shared/Services/store-purchase.service';
import { StoreProductService } from '../../../../../shared/Services/store-product.service';
import { SuppliersService } from '../../../../../shared/Services/suppliers.service';
import {
  StorePurchase,
  StoreProduct,
} from '../../../../../shared/interfaces/store.interface';
import { Supplier } from '../../../../../shared/interfaces/supplier.interface';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { AuthService } from '../../../../../shared/Services/auth.service';

@Component({
  selector: 'app-add-store-purchase',
  templateUrl: './add-store-purchase.component.html',
  styleUrl: './add-store-purchase.component.scss',
})
export class AddStorePurchaseComponent
  extends ModalComponent
  implements OnInit
{
  purchaseForm: FormGroup;
  purchase: StorePurchase | null = null;
  isUpdateMode: boolean = false;
  storeProducts: StoreProduct[] = [];
  suppliers: Supplier[] = [];
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private storePurchaseService: StorePurchaseService,
    private storeProductService: StoreProductService,
    private suppliersService: SuppliersService,
    public override authService: AuthService,
  ) {
    super();
    this.purchaseForm = this.fb.group({
      supplierId: [''],
      receivedBy: ['', Validators.required],
      notes: [''],
      deliveryDate: [''],
      items: this.fb.array([]),
    });
    this.purchase = this.dialogRemoteControl.payload;
    if (this.purchase) {
      this.isUpdateMode = true;
      this.purchaseForm.patchValue({
        supplierId: this.purchase.supplierId || '',
        receivedBy: this.purchase.receivedBy || '',
        notes: this.purchase.notes || '',
        deliveryDate: this.purchase.deliveryDate
          ? new Date(this.purchase.deliveryDate).toISOString().split('T')[0]
          : '',
      });
      // Load existing items
      if (this.purchase.items?.length) {
        this.purchase.items.forEach((item) => {
          this.items.push(
            this.fb.group({
              storeProductId: [item.storeProductId, Validators.required],
              quantity: [
                item.quantity,
                [Validators.required, Validators.min(1)],
              ],
              unitPrice: [
                item.unitPrice,
                [Validators.required, Validators.min(0)],
              ],
            }),
          );
        });
      }
    } else {
      this.addItem(); // Start with one blank item row
    }
  }

  get items(): FormArray {
    return this.purchaseForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadStoreProducts();
    this.loadSuppliers();
    if (!this.isUpdateMode) {
      const currentUser = this.authService.user$.value;
      if (currentUser?.fullName) {
        this.purchaseForm.patchValue({ receivedBy: currentUser.fullName });
      }
    }
  }

  loadStoreProducts(): void {
    this.storeProductService.getAllStoreProducts({ isActive: true }).subscribe(
      (products) => {
        this.storeProducts = products;
      },
      () => {
        this.toast.error('Error loading store products');
      },
    );
  }

  loadSuppliers(): void {
    this.suppliersService.getAllSupplier().subscribe(
      (suppliers) => {
        this.suppliers = suppliers.filter((s) => !s.deleted);
      },
      () => {
        this.toast.error('Error loading suppliers');
      },
    );
  }

  addItem(): void {
    this.items.push(
      this.fb.group({
        storeProductId: ['', Validators.required],
        quantity: ['', [Validators.required, Validators.min(1)]],
        unitPrice: ['', [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  getItemTotal(index: number): number {
    const item = this.items.at(index);
    const qty = Number(item.get('quantity')?.value) || 0;
    const price = Number(item.get('unitPrice')?.value) || 0;
    return qty * price;
  }

  getGrandTotal(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getItemTotal(i);
    }
    return total;
  }

  closeModal() {
    this.close();
  }

  buildPayload(): any {
    const formVal = this.purchaseForm.value;
    return {
      receivedBy: formVal.receivedBy,
      supplierId: formVal.supplierId ? Number(formVal.supplierId) : undefined,
      notes: formVal.notes || undefined,
      deliveryDate: formVal.deliveryDate || undefined,
      items: formVal.items.map((item: any) => ({
        storeProductId: Number(item.storeProductId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };
  }

  onSubmit() {
    if (this.purchaseForm.valid && this.items.length > 0) {
      this.loading = true;
      this.storePurchaseService.addStorePurchase(this.buildPayload()).subscribe(
        () => {
          this.loading = false;
          this.toast.success('Purchase order created successfully');
          this.closeModal();
        },
        (error) => {
          this.loading = false;
          this.toast.error(error.error?.message || 'Error creating purchase');
        },
      );
    }
  }

  updatePurchase() {
    if (this.purchaseForm.valid && this.items.length > 0) {
      this.loading = true;
      this.storePurchaseService
        .updateStorePurchase(this.purchase!.id, this.buildPayload())
        .subscribe(
          () => {
            this.loading = false;
            this.toast.success('Purchase order updated successfully');
            this.closeModal();
          },
          (error) => {
            this.loading = false;
            this.toast.error(error.error?.message || 'Error updating purchase');
          },
        );
    }
  }

  submit() {
    if (this.isUpdateMode) {
      this.updatePurchase();
    } else {
      this.onSubmit();
    }
  }
}
