import { Component, OnInit } from '@angular/core';
import {
  StorePurchase,
  StorePurchaseItem,
} from '../../../../../shared/interfaces/store.interface';
import { StorePurchaseService } from '../../../../../shared/Services/store-purchase.service';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

interface ReceiveLineItem {
  itemId: number;
  productName: string;
  orderedQuantity: number;
  previouslyReceived: number;
  remainingQuantity: number;
  receivingNow: number;
  unitPrice: number;
}

@Component({
  selector: 'app-receive-store-purchase',
  templateUrl: './receive-store-purchase.component.html',
  styleUrl: './receive-store-purchase.component.scss',
})
export class ReceiveStorePurchaseComponent
  extends ModalComponent
  implements OnInit
{
  purchase: StorePurchase;
  receiveItems: ReceiveLineItem[] = [];
  loading: boolean = false;
  receiveNotes: string = '';

  constructor(private storePurchaseService: StorePurchaseService) {
    super();
    this.purchase = this.dialogRemoteControl.payload;
  }

  ngOnInit(): void {
    this.receiveItems = this.purchase.items.map((item: StorePurchaseItem) => ({
      itemId: item.id,
      productName:
        item.storeProduct?.productName || `Product #${item.storeProductId}`,
      orderedQuantity: item.quantity,
      previouslyReceived: item.receivedQuantity || 0,
      remainingQuantity: item.quantity - (item.receivedQuantity || 0),
      receivingNow: item.quantity - (item.receivedQuantity || 0),
      unitPrice: item.unitPrice,
    }));
  }

  get totalReceiving(): number {
    return this.receiveItems.reduce(
      (sum, item) => sum + item.receivingNow * item.unitPrice,
      0,
    );
  }

  get hasValidQuantities(): boolean {
    return this.receiveItems.some((item) => item.receivingNow > 0);
  }

  receiveAll(): void {
    this.receiveItems.forEach(
      (item) => (item.receivingNow = item.remainingQuantity),
    );
  }

  clearAll(): void {
    this.receiveItems.forEach((item) => (item.receivingNow = 0));
  }

  onQuantityChange(item: ReceiveLineItem): void {
    if (item.receivingNow < 0) item.receivingNow = 0;
    if (item.receivingNow > item.remainingQuantity)
      item.receivingNow = item.remainingQuantity;
  }

  closeModal(): void {
    this.close();
  }

  submitReceive(): void {
    const items = this.receiveItems
      .filter((item) => item.receivingNow > 0)
      .map((item) => ({
        itemId: item.itemId,
        receivedQuantity: item.receivingNow,
      }));

    if (items.length === 0) {
      this.toast.error('Please enter quantities to receive');
      return;
    }

    this.loading = true;
    this.storePurchaseService
      .receiveStorePurchase(
        this.purchase.id,
        items,
        this.receiveNotes || undefined,
      )
      .subscribe(
        () => {
          this.loading = false;
          this.toast.success('Items received successfully');
          this.close('received');
        },
        (error) => {
          this.loading = false;
          this.toast.error(error.error?.message || 'Error receiving purchase');
        },
      );
  }
}
