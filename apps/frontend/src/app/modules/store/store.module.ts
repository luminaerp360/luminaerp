import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Department Components
import { ShowDepartmentsComponent } from './components/departments/show-departments/show-departments.component';
import { AddDepartmentComponent } from './components/departments/add-department/add-department.component';

// Store Category Components
import { ShowStoreCategoriesComponent } from './components/store-categories/show-store-categories/show-store-categories.component';
import { AddStoreCategoryComponent } from './components/store-categories/add-store-category/add-store-category.component';

// Store Product Components
import { ShowStoreProductsComponent } from './components/store-products/show-store-products/show-store-products.component';
import { AddStoreProductComponent } from './components/store-products/add-store-product/add-store-product.component';

// Store Purchase Components
import { ShowStorePurchasesComponent } from './components/store-purchases/show-store-purchases/show-store-purchases.component';
import { AddStorePurchaseComponent } from './components/store-purchases/add-store-purchase/add-store-purchase.component';
import { ReceiveStorePurchaseComponent } from './components/store-purchases/receive-store-purchase/receive-store-purchase.component';

// Requisition Components
import { ShowRequisitionsComponent } from './components/requisitions/show-requisitions/show-requisitions.component';
import { AddRequisitionComponent } from './components/requisitions/add-requisition/add-requisition.component';

@NgModule({
  declarations: [
    // Department Components
    ShowDepartmentsComponent,
    AddDepartmentComponent,

    // Store Category Components
    ShowStoreCategoriesComponent,
    AddStoreCategoryComponent,

    // Store Product Components
    ShowStoreProductsComponent,
    AddStoreProductComponent,

    // Store Purchase Components
    ShowStorePurchasesComponent,
    AddStorePurchaseComponent,
    ReceiveStorePurchaseComponent,

    // Requisition Components
    ShowRequisitionsComponent,
    AddRequisitionComponent,
  ],
  imports: [CommonModule, FormsModule, HttpClientModule, ReactiveFormsModule],
  exports: [
    ShowDepartmentsComponent,
    ShowStoreCategoriesComponent,
    ShowStoreProductsComponent,
    ShowStorePurchasesComponent,
    ShowRequisitionsComponent,
  ],
})
export class StoreModule {}
