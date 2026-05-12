import { Component, OnInit } from '@angular/core';
import { StoreCategory } from '../../../../../shared/interfaces/store.interface';
import { StoreCategoryService } from '../../../../../shared/Services/store-category.service';
import { AddStoreCategoryComponent } from '../add-store-category/add-store-category.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-store-categories',
  templateUrl: './show-store-categories.component.html',
  styleUrl: './show-store-categories.component.scss',
})
export class ShowStoreCategoriesComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddStoreCategoryComponent
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddStoreCategoryComponent
  );
  storeCategories: StoreCategory[] = [];
  query: string = '';
  loading: boolean = false;

  constructor(
    private storeCategoryService: StoreCategoryService,
    private toast: HotToastService
  ) {}

  ngOnInit(): void {
    this.getAllStoreCategories();
  }

  onInputChange() {
    this.getAllStoreCategories();
  }

  getAllStoreCategories(): void {
    this.loading = true;
    this.storeCategoryService
      .getAllStoreCategories()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((categories) => {
        if (this.query && this.query.trim() !== '') {
          this.storeCategories = categories.filter((category) =>
            category.name.toLowerCase().includes(this.query.toLowerCase())
          );
        } else {
          this.storeCategories = categories;
        }
      });
  }

  deleteStoreCategory(id: number): void {
    if (confirm('Are you sure you want to delete this store category?')) {
      this.loading = true;
      this.storeCategoryService
        .deleteStoreCategory(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Store category deleted successfully');
          this.getAllStoreCategories();
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
        this.getAllStoreCategories();
      }
    });
  }

  openUpdateDialog(category: StoreCategory) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog(category).subscribe((resp) => {
      if (resp) {
        this.getAllStoreCategories();
      }
    });
  }
}
