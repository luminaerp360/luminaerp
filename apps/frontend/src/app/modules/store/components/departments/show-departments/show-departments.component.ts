import { Component, OnInit } from '@angular/core';
import { Department } from '../../../../../shared/interfaces/store.interface';
import { DepartmentService } from '../../../../../shared/Services/department.service';
import { AddDepartmentComponent } from '../add-department/add-department.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-departments',
  templateUrl: './show-departments.component.html',
  styleUrl: './show-departments.component.scss',
})
export class ShowDepartmentsComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddDepartmentComponent
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddDepartmentComponent
  );
  departments: Department[] = [];
  query: string = '';
  loading: boolean = false;

  constructor(
    private departmentService: DepartmentService,
    private toast: HotToastService
  ) {}

  ngOnInit(): void {
    this.getAllDepartments();
  }

  onInputChange() {
    this.getAllDepartments();
  }

  getAllDepartments(): void {
    this.loading = true;
    this.departmentService
      .getAllDepartments()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((departments) => {
        if (this.query && this.query.trim() !== '') {
          this.departments = departments.filter((department) =>
            department.name.toLowerCase().includes(this.query.toLowerCase())
          );
        } else {
          this.departments = departments;
        }
      });
  }

  deleteDepartment(id: number): void {
    if (confirm('Are you sure you want to delete this department?')) {
      this.loading = true;
      this.departmentService
        .deleteDepartment(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Department deleted successfully');
          this.getAllDepartments();
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
        this.getAllDepartments();
      }
    });
  }

  openUpdateDialog(department: Department) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog(department).subscribe((resp) => {
      if (resp) {
        this.getAllDepartments();
      }
    });
  }
}
