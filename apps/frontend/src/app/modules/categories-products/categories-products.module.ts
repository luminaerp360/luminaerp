import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowProductsComponent } from './components/products/show-products/show-products.component';
import { AddProductsComponent } from './components/products/add-products/add-products.component';
import { UpdateproductComponent } from './components/products/updateproduct/updateproduct.component';
import { ShowCategoriesComponent } from './components/categories/show-categories/show-categories.component';
import { AddCategoryComponent } from './components/categories/add-category/add-category.component';
import { UpdateCategoryComponent } from './components/categories/update-category/update-category.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProductsUploadComponent } from './components/products/products-upload/products-upload.component';



@NgModule({
  declarations: [
    ShowProductsComponent,
    AddProductsComponent,
    UpdateproductComponent,
    ShowCategoriesComponent,
    AddCategoryComponent,
    UpdateCategoryComponent,
    ProductsUploadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule
  ]
})
export class CategoriesProductsModule { }
