import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddCustomerComponent } from './components/add-customer/add-customer.component';
import { ShowCustomerComponent } from './components/show-customer/show-customer.component';
import { EditCustomerComponent } from './components/edit-customer/edit-customer.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AddCustomerComponent,
    ShowCustomerComponent,
    EditCustomerComponent,
  ],
  imports: [CommonModule, FormsModule],
})
export class CustomersModule {}
