import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { CategoryService } from '../../../../../shared/Services/category.service';
import { Category } from '../../../../../shared/interfaces/categories';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

@Component({
  selector: 'app-add-category',
  templateUrl: './add-category.component.html',
  styleUrl: './add-category.component.scss',
})
export class AddCategoryComponent extends ModalComponent {
  categoryForm: FormGroup;

  category: Category | null = null;
  isUpdateMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService
  ) {
    super();
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      picture: [''],
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
      this.categoryService.addCategory(categoryData).subscribe(
        (response) => {
          // Reset the form if needed
          this.categoryForm.reset();
          this.toast.success('Category added successfully');
          this.closeModal();
        },
        (error) => {
          this.toast.error('Error adding category');
          // Handle error
        }
      );
    }
  }
  updateCategory() {
    if (this.categoryForm.valid) {
      const categoryData = this.categoryForm.value;
      this.categoryService
        .updateCategory(this.category!.id, categoryData)
        .subscribe(
          (response) => {
            // Reset the form if needed
            this.categoryForm.reset();
            this.toast.success('Category updated successfully');
            this.closeModal();
          },
          (error) => {
            this.toast.error('Error updating category');
            // Handle error
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
