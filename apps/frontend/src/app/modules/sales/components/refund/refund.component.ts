import { Component } from '@angular/core';
import { Product } from '../../../../shared/interfaces/products';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  RefundDto,
  RefundItem,
} from '../../../../shared/interfaces/sales.interface';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
interface RefundedProduct extends Product {
  refundedQuantity: number;
}

@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrl: './refund.component.scss',
})
export class RefundComponent extends ModalComponent {
  Sale: any;
  products: Product[] = [];
  refundForm: FormGroup;
  refundPaymentMethods = ['Cash', 'Mpesa', 'Bank'];
  refundedItems: RefundedProduct[] = [];

  constructor(private fb: FormBuilder) {
    super();
    this.Sale = this.dialogRemoteControl.payload;
    this.products = this.Sale.items.map((item: Product) => ({
      ...item,
      selectedItems: item.selectedItems,
    }));

    this.refundForm = this.fb.group({
      refundPaymentMethod: ['', Validators.required],
      Cash_refund: [0],
      Mpesa_refund: [0],
      Bank_refund: [0],
      Mpesa_refund_code: [''],
      Bank_refund_code: [''],
      refundedBy: ['', Validators.required],
    });

    this.refundForm
      .get('refundPaymentMethod')
      ?.valueChanges.subscribe((method) => {
        this.updateRefundAmounts();
      });
  }

  reduceQuantity(product: Product): void {
    if ((product.selectedItems ?? 0) > 0) {
      product.selectedItems = (product.selectedItems ?? 0) - 1;
      this.updateRefundedItems(product);
      this.updateRefundAmounts();
    }
  }

  increaseQuantity(product: Product): void {
    if (product.selectedItems! < product.quantity!) {
      product.selectedItems = (product.selectedItems ?? 0) + 1;
      this.updateRefundedItems(product);
      this.updateRefundAmounts();
    }
  }

  updateRefundedItems(product: Product): void {
    const existingRefundedItem = this.refundedItems.find(
      (item) => item.id === product.id
    );
    console.log('Existing items', existingRefundedItem);

    const originalProduct = this.Sale.items.find(
      (item: Product) => item.id === product.id
    );
    console.log('Original product', originalProduct);

    if (!originalProduct) return;

    const refundedQuantity =
      originalProduct.selectedItems! - product.selectedItems!;

    if (refundedQuantity > 0) {
      if (existingRefundedItem) {
        existingRefundedItem.refundedQuantity = refundedQuantity;
      } else {
        this.refundedItems.push({
          ...product,
          refundedQuantity: refundedQuantity,
        });
      }
    } else if (existingRefundedItem) {
      this.refundedItems = this.refundedItems.filter(
        (item) => item.id !== product.id
      );
    }
  }

  updateRefundAmounts(): void {
    const totalRefund = this.calculateTotalRefund();
    const method = this.refundForm.get('refundPaymentMethod')?.value;

    this.refundForm.patchValue({
      Cash_refund: method === 'Cash' ? totalRefund : 0,
      Mpesa_refund: method === 'Mpesa' ? totalRefund : 0,
      Bank_refund: method === 'Bank' ? totalRefund : 0,
    });
  }

  calculateTotalRefund(): number {
    return this.refundedItems.reduce(
      (total, product) => total + product.price * product.refundedQuantity,
      0
    );
  }

  submitRefund() {
    if (this.refundForm.valid) {
      const refundItems: RefundItem[] = this.refundedItems.map((item) => ({
        id: item.id,
        quantity: item.refundedQuantity,
      }));

      const refundDto: RefundDto = {
        orderId: this.Sale.id,
        refundItems: refundItems,
        totalRefund: this.calculateTotalRefund(),
        refundPaymentMethod: this.refundForm.get('refundPaymentMethod')?.value,
        refundedBy: this.refundForm.get('refundedBy')?.value,
      };
      console.log('RefundDto:', refundDto);

      this.salesService.refundSale(refundDto).subscribe(
        (response) => {
          console.log('Refund successful:', response);
          this.close(response);
        },
        (error) => {
          console.error('Refund failed:', error);
        }
      );
    }
  }
}
