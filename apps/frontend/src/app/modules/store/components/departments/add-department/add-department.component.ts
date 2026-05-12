import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DepartmentService } from '../../../../../shared/Services/department.service';
import { Department } from '../../../../../shared/interfaces/store.interface';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

@Component({
  selector: 'app-add-department',
  templateUrl: './add-department.component.html',
  styleUrl: './add-department.component.scss',
})
export class AddDepartmentComponent extends ModalComponent {
  departmentForm: FormGroup;
  department: Department | null = null;
  isUpdateMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService
  ) {
    super();
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
    this.department = this.dialogRemoteControl.payload;
    if (this.department) {
      this.departmentForm.patchValue(this.department);
      this.isUpdateMode = true;
    }
  }

  closeModal() {
    this.close();
  }

  onSubmit() {
    if (this.departmentForm.valid) {
      const departmentData = this.departmentForm.value;
      this.departmentService.addDepartment(departmentData).subscribe(
        (response) => {
          this.departmentForm.reset();
          this.toast.success('Department added successfully');
          this.closeModal();
        },
        (error) => {
          this.toast.error('Error adding department');
        }
      );
    }
  }

  updateDepartment() {
    if (this.departmentForm.valid) {
      const departmentData = this.departmentForm.value;
      this.departmentService
        .updateDepartment(this.department!.id, departmentData)
        .subscribe(
          (response) => {
            this.departmentForm.reset();
            this.toast.success('Department updated successfully');
            this.closeModal();
          },
          (error) => {
            this.toast.error('Error updating department');
          }
        );
    }
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateDepartment();
    } else {
      this.onSubmit();
    }
  }
}
