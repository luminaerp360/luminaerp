import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-update-suplliers',
  templateUrl: './update-suplliers.component.html',
  styleUrl: './update-suplliers.component.scss',
})
export class UpdateSuplliersComponent {
  supplierForm: FormGroup;
  @Input() modalId: string = '';
  @Input() isModalVisible: boolean = false;
  @Input() supplierIdToEdit: string = '';
  @Output() toggleModal = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private supplierService: SuppliersService,
    private toast: HotToastService
  ) {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      // Add more supplier fields here as needed
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['supplierIdToEdit'] &&
      !changes['supplierIdToEdit'].firstChange
    ) {
      this.getSupplierById(this.supplierIdToEdit);
    }
  }
  getSupplierById(id: string) {
    this.supplierService.getSupplierbyId(id).subscribe(
      (response: any) => {
        this.supplierForm.patchValue(response);
      },
      (error: any) => {
        console.error('Error fetching supplier:', error);
        // Handle error
      }
    );
  }

  onSubmit() {
    if (this.supplierForm.valid) {
      // Setting default values for totalUnpaidSuppliers and deleted
      const supplierData = {
        ...this.supplierForm.value,
        totalUnpaidSuppliers: 0,
        deleted: false,
      };

      this.supplierService
        .updateSupplier(this.supplierIdToEdit, supplierData)
        .subscribe(
          (response: any) => {
            this.toast.success('Supplier added successfully');
            // Reset the form if needed
            this.supplierForm.reset();
            this.closeModal();
          },
          (error: any) => {
            console.error('Error adding supplier:', error);
            this.toast.error('Error adding supplier:', error);
            // Handle error
          }
        );
    }
  }

  closeModal() {
    this.toggleModal.emit();
  }
}
