import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddLpoComponent } from './components/add-lpo/add-lpo.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LpoListComponent } from './components/lpo-list/lpo-list.component';
import { RouterModule } from '@angular/router';
import { ApproveLpoComponent } from './components/approve-lpo/approve-lpo.component';



@NgModule({
  declarations: [
    AddLpoComponent,
    LpoListComponent,
    ApproveLpoComponent
  ],
  imports: [
    CommonModule,ReactiveFormsModule,FormsModule,RouterModule
  ]
})
export class LpoModule { }
