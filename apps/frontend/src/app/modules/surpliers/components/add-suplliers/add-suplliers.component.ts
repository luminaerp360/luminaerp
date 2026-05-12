import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-add-suplliers',
  templateUrl: './add-suplliers.component.html',
  styleUrls: ['./add-suplliers.component.scss'],
})
export class AddSuplliersComponent {
  supplierForm: FormGroup;
  @Input() modalId: string = '';
  @Input() isModalVisible: boolean = false;
  @Output() toggleModal = new EventEmitter<void>();
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private supplierService: SuppliersService,
    private toast: HotToastService
  ) {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.supplierForm.valid) {
      this.isLoading = true;
      const supplierData = {
        ...this.supplierForm.value,
        totalUnpaidSuppliers: 0,
        deleted: false,
      };

      this.supplierService.addSupplier(supplierData).subscribe({
        next: (response: any) => {
          this.toast.success('Supplier added successfully');
          this.supplierForm.reset();
          this.closeModal();
          this.isLoading = false;
        },
        error: (error: any) => {
          this.toast.error('Error adding supplier');
          console.log('Error adding supplier:', error);
          this.isLoading = false;
        },
      });
    }
  }

  closeModal() {
    this.toggleModal.emit();
  }
}
