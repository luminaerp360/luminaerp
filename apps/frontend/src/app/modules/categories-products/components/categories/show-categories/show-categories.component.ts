import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Category } from '../../../../../shared/interfaces/categories';
import { CategoryService } from '../../../../../shared/Services/category.service';
import { AddCategoryComponent } from '../add-category/add-category.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-show-categories',
  templateUrl: './show-categories.component.html',
  styleUrl: './show-categories.component.scss',
})
export class ShowCategoriesComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddCategoryComponent
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddCategoryComponent
  );
  categories: Category[] = [];
  query: string = '';
  loading: boolean = false;

  @Output() categoryId = new EventEmitter<number>();

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.getAllCategories(this.query);
  }

  onInputChange() {
    this.getAllCategories(this.query);
  }

  getAllCategories(searchQuery?: string): void {
    this.loading = true;
    this.categoryService
      .getAllCategories()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((categories) => {
        if (searchQuery && searchQuery.trim() !== '') {
          this.categories = categories.filter((category) =>
            category.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        } else {
          this.categories = categories;
        }
      });
  }

  deleteCategory(id: number): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.loading = true;
      this.categoryService
        .deleteCategory(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.getAllCategories(this.query);
        });
    }
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog().subscribe((resp) => {
      if (resp) {
        this.getAllCategories();
      }
    });
  }

  openUpdateDialog(category: Category) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog(category).subscribe((resp) => {
      if (resp) {
        this.getAllCategories();
      }
    });
  }
}
