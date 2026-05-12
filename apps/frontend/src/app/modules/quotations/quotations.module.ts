import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ShowQuotationsComponent } from './components/show-quotations/show-quotations.component';
import { UpdateQuotationsComponent } from './components/update-quotations/update-quotations.component';
import { ApproveQuotationsComponent } from './components/approve-quotations/approve-quotations.component';
import { FindByIdPipe } from './pipes/products.pipe';
import { AddQuatationsComponent } from './components/add-quatations/add-quatations.component';

@NgModule({
  declarations: [
    AddQuatationsComponent,
    ShowQuotationsComponent,
    UpdateQuotationsComponent,
    ApproveQuotationsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    SharedModule,
  ],
})
export class QuotationsModule {}
