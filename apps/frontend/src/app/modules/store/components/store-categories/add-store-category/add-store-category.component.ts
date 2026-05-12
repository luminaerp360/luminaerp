import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { StoreCategoryService } from '../../../../../shared/Services/store-category.service';
import { StoreCategory } from '../../../../../shared/interfaces/store.interface';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

@Component({
  selector: 'app-add-store-category',
  templateUrl: './add-store-category.component.html',
  styleUrl: './add-store-category.component.scss',
})
export class AddStoreCategoryComponent extends ModalComponent {
  categoryForm: FormGroup;
  category: StoreCategory | null = null;
  isUpdateMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private storeCategoryService: StoreCategoryService
  ) {
    super();
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
    this.category = this.dialogRemoteControl.payload;
    if (this.category) {
      this.categoryForm.patchValue(this.category);
      this.isUpdateMode = true;
    }
  }

  closeModal() {
    this.close();
  }

  onSubmit() {
    if (this.categoryForm.valid) {
      const categoryData = this.categoryForm.value;
      this.storeCategoryService.addStoreCategory(categoryData).subscribe(
        (response) => {
          this.categoryForm.reset();
          this.toast.success('Store category added successfully');
          this.closeModal();
        },
        (error) => {
          this.toast.error('Error adding store category');
        }
      );
    }
  }

  updateCategory() {
    if (this.categoryForm.valid) {
      const categoryData = this.categoryForm.value;
      this.storeCategoryService
        .updateStoreCategory(this.category!.id, categoryData)
        .subscribe(
          (response) => {
            this.categoryForm.reset();
            this.toast.success('Store category updated successfully');
            this.closeModal();
          },
          (error) => {
            this.toast.error('Error updating store category');
          }
        );
    }
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateCategory();
    } else {
      this.onSubmit();
    }
  }
}
