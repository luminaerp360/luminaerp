import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { StoreProductService } from '../../../../../shared/Services/store-product.service';
import { DepartmentService } from '../../../../../shared/Services/department.service';
import { StoreCategoryService } from '../../../../../shared/Services/store-category.service';
import {
  StoreProduct,
  Department,
  StoreCategory,
} from '../../../../../shared/interfaces/store.interface';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

@Component({
  selector: 'app-add-store-product',
  templateUrl: './add-store-product.component.html',
  styleUrl: './add-store-product.component.scss',
})
export class AddStoreProductComponent extends ModalComponent implements OnInit {
  productForm: FormGroup;
  product: StoreProduct | null = null;
  isUpdateMode: boolean = false;
  departments: Department[] = [];
  storeCategories: StoreCategory[] = [];
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private storeProductService: StoreProductService,
    private departmentService: DepartmentService,
    private storeCategoryService: StoreCategoryService,
  ) {
    super();
    this.productForm = this.fb.group({
      productName: ['', Validators.required],
      sku: [''],
      description: [''],
      storeCategoryId: ['', Validators.required],
      departmentId: ['', Validators.required],
      unitOfMeasurement: ['', Validators.required],
      buyingPrice: ['', [Validators.required, Validators.min(0)]],
      quantity: ['', [Validators.required, Validators.min(0)]],
      reorderLevel: [0, [Validators.min(0)]],
      maxStock: [0, [Validators.min(0)]],
      location: [''],
      isActive: [true],
    });
    this.product = this.dialogRemoteControl.payload;
    if (this.product) {
      this.productForm.patchValue(this.product);
      this.isUpdateMode = true;
    }
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadStoreCategories();
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe(
      (departments) => {
        this.departments = departments;
      },
      (error) => {
        this.toast.error('Error loading departments');
      },
    );
  }

  loadStoreCategories(): void {
    this.storeCategoryService.getAllStoreCategories().subscribe(
      (categories) => {
        this.storeCategories = categories;
      },
      (error) => {
        this.toast.error('Error loading store categories');
      },
    );
  }

  closeModal() {
    this.close();
  }

  private buildPayload(): any {
    const v = this.productForm.value;
    return {
      productName: v.productName,
      sku: v.sku || undefined,
      description: v.description || undefined,
      storeCategoryId: Number(v.storeCategoryId),
      departmentId: Number(v.departmentId),
      unitOfMeasurement: v.unitOfMeasurement,
      buyingPrice: Number(v.buyingPrice),
      quantity: Number(v.quantity),
      reorderLevel: Number(v.reorderLevel) || 0,
      maxStock: Number(v.maxStock) || 0,
      location: v.location || undefined,
      isActive: v.isActive,
    };
  }

  onSubmit() {
    if (this.productForm.valid) {
      this.loading = true;
      this.storeProductService.addStoreProduct(this.buildPayload()).subscribe(
        () => {
          this.loading = false;
          this.productForm.reset();
          this.toast.success('Store product added successfully');
          this.closeModal();
        },
        (error) => {
          this.loading = false;
          this.toast.error(
            error.error?.message || 'Error adding store product',
          );
        },
      );
    }
  }

  updateProduct() {
    if (this.productForm.valid) {
      this.loading = true;
      this.storeProductService
        .updateStoreProduct(this.product!.id, this.buildPayload())
        .subscribe(
          () => {
            this.loading = false;
            this.productForm.reset();
            this.toast.success('Store product updated successfully');
            this.closeModal();
          },
          (error) => {
            this.loading = false;
            this.toast.error(
              error.error?.message || 'Error updating store product',
            );
          },
        );
    }
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateProduct();
    } else {
      this.onSubmit();
    }
  }
}
