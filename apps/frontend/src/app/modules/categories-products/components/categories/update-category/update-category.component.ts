import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { CategoryService } from '../../../../../shared/Services/category.service';
import { Category } from '../../../../../shared/interfaces/categories';

@Component({
  selector: 'app-update-category',
  templateUrl: './update-category.component.html',
  styleUrl: './update-category.component.scss',
})
export class UpdateCategoryComponent implements OnChanges {
  categoryForm: FormGroup;
  @Input() modalId: string = '';
  @Input() categoryToEdit: number | null = null;
  @Input() isModalVisible: boolean = false;
  @Output() toggleModal = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private toast: HotToastService
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      picture: [''],
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryToEdit'] && !changes['categoryToEdit'].firstChange) {
      this.getCategoryDetails(this.categoryToEdit!);
    }
  }

  closeModal() {
    this.toggleModal.emit();
  }

  getCategoryDetails(categoryId: number) {
    this.categoryService
      .getCategorybyId(categoryId)
      .subscribe((category: Category) => {
        this.categoryForm.patchValue({
          name: category.name,
          description: category.description,
          picture: category.picture,
        });
      });
  }

  onSubmit() {
    if (!this.categoryForm.valid) {
      this.toast.error('Please fill all the required fields');
      return;
    }
    const categoryData = this.categoryForm.value;
    this.categoryService
      .updateCategory(this.categoryToEdit!, categoryData)
      .subscribe(
        (response) => {
          this.toast.success('Category Update successfully:');
          // Reset the form if needed
          this.categoryForm.reset();
          this.closeModal();
        },
        (error) => {
          this.toast.error('Error Updating category');
          // Handle error
        }
      );
  }
}
