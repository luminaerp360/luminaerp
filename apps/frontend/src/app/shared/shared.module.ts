import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProductSelectorComponent } from './components/product-selector/product-selector.component';
import { SelectedProductsComponent } from './components/selected-products/selected-products.component';
import { CheckoutSummaryComponent } from './components/checkout-summary/checkout-summary.component';
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';
import { DocumentPrintSettingsComponent } from './components/document-print-settings/document-print-settings.component';

@NgModule({
  declarations: [
    ProductSelectorComponent,
    SelectedProductsComponent,
    CheckoutSummaryComponent,
    NotificationBellComponent,
    DocumentPrintSettingsComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [
    ProductSelectorComponent,
    SelectedProductsComponent,
    CheckoutSummaryComponent,
    NotificationBellComponent,
    DocumentPrintSettingsComponent,
  ],
})
export class SharedModule {}
