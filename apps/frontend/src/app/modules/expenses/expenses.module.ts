import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpensesListComponent } from './components/expenses-list/expenses-list.component';
import { ExpensesFormComponent } from './components/expenses-form/expenses-form.component';
import { ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    ExpensesListComponent,
    ExpensesFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class ExpensesModule { }
