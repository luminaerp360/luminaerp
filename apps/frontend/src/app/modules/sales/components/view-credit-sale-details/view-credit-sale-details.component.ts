import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';

@Component({
  selector: 'app-view-credit-sale-details',
  templateUrl: './view-credit-sale-details.component.html',
  styleUrl: './view-credit-sale-details.component.scss',
})
export class ViewCreditSaleDetailsComponent
  extends ModalComponent
  implements OnInit
{
  orderDetails: any;
  parsedItems: any[] = [];

  constructor() {
    super();
  }

  ngOnInit() {
    this.orderDetails = this.dialogRemoteControl.payload;
    this.parseItems();
  }

  private parseItems() {
    try {
      console.log('Credit sale details:', this.orderDetails);

      if (!this.orderDetails.items) {
        console.warn('No items found in credit sale details');
        this.parsedItems = [];
        return;
      }

      // Handle both SQLite (string) and PostgreSQL (array) formats
      if (typeof this.orderDetails.items === 'string') {
        this.parsedItems = JSON.parse(this.orderDetails.items);
      } else if (Array.isArray(this.orderDetails.items)) {
        this.parsedItems = this.orderDetails.items;
      } else {
        console.warn(
          'Items property is not a string or array:',
          this.orderDetails.items
        );
        this.parsedItems = [];
      }

      console.log('Parsed items:', this.parsedItems);
    } catch (error) {
      console.error('Error parsing order items:', error);
      this.parsedItems = [];
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }
}
