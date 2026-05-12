import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AddSuplliersComponent } from './components/add-suplliers/add-suplliers.component';
import { ShowSuplliersComponent } from './components/show-suplliers/show-suplliers.component';
import { UpdateSuplliersComponent } from './components/update-suplliers/update-suplliers.component';
import { SuppliersPaymentsComponent } from './components/suppliers-payments/suppliers-payments.component';

@NgModule({
  declarations: [
    AddSuplliersComponent,
    ShowSuplliersComponent,
    UpdateSuplliersComponent,
    SuppliersPaymentsComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
})
export class SurpliersModule {}
