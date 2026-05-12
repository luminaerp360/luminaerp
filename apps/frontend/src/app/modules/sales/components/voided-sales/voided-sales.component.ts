import { Component, OnInit } from '@angular/core';
import { Sales } from '../../../../shared/interfaces/sales.interface';
import { SalesService } from '../../../../shared/Services/sales.service';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { CreditPaymentsComponent } from '../credit sales/credit-payments/credit-payments.component';
import { ViewOrderDetailsComponent } from '../view-order-details/view-order-details.component';

@Component({
  selector: 'app-voided-sales',
  templateUrl: './voided-sales.component.html',
  styleUrls: ['./voided-sales.component.scss'],
})
export class VoidedSalesComponent implements OnInit {
  sales: Sales[] = [];
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;
  error: string | null = null;
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    ViewOrderDetailsComponent
  );

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    // Initialize with current month's data
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    this.getVoidedSalesForRange();
  }

  getVoidedSalesForRange(): void {
    if (!this.startDate || !this.endDate) {
      this.error = 'Please select both start and end dates.';
      return;
    }

    this.loading = true;
    this.error = null;

    this.salesService
      .getVoidedSalesByDateRange(this.startDate, this.endDate)
      .subscribe({
        next: (sales: Sales[]) => {
          this.sales = sales;
          this.loading = false;
          console.log('Voided sales retrieved:', this.sales);
        },
        error: (err) => {
          this.error =
            'An error occurred while fetching voided sales. Please try again.';
          this.loading = false;
          console.error('Error fetching voided sales:', err);
        },
      });
  }

  openDialog(payload: any) {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog(payload).subscribe((resp) => {
      console.log('Response from dialog content:', resp);
    });
  }
}
