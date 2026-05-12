import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { RequisitionService } from '../../../../../shared/Services/requisition.service';
import { StoreProductService } from '../../../../../shared/Services/store-product.service';
import {
  Requisition,
  StoreProduct,
  Department,
  RequisitionPriority,
} from '../../../../../shared/interfaces/store.interface';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { DepartmentService } from '../../../../../shared/Services/department.service';

@Component({
  selector: 'app-add-requisition',
  templateUrl: './add-requisition.component.html',
  styleUrl: './add-requisition.component.scss',
})
export class AddRequisitionComponent extends ModalComponent implements OnInit {
  requisitionForm: FormGroup;
  requisition: Requisition | null = null;
  isUpdateMode: boolean = false;
  storeProducts: StoreProduct[] = [];
  departments: Department[] = [];
  loading: boolean = false;
  priorities: RequisitionPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  constructor(
    private fb: FormBuilder,
    private requisitionService: RequisitionService,
    private storeProductService: StoreProductService,
    private departmentService: DepartmentService,
  ) {
    super();
    this.requisitionForm = this.fb.group({
      departmentId: [''],
      priority: ['MEDIUM', Validators.required],
      purpose: [''],
      notes: [''],
      items: this.fb.array([]),
    });
    this.requisition = this.dialogRemoteControl.payload;
    if (this.requisition) {
      this.isUpdateMode = true;
      this.requisitionForm.patchValue({
        departmentId: this.requisition.departmentId || '',
        priority: this.requisition.priority || 'MEDIUM',
        purpose: this.requisition.purpose || '',
        notes: this.requisition.notes || '',
      });
      if (this.requisition.items?.length) {
        this.requisition.items.forEach((item) => {
          this.items.push(
            this.fb.group({
              storeProductId: [item.storeProductId, Validators.required],
              quantityRequested: [
                item.quantityRequested,
                [Validators.required, Validators.min(1)],
              ],
              notes: [item.notes || ''],
            }),
          );
        });
      }
    } else {
      this.addItem();
    }
  }

  get items(): FormArray {
    return this.requisitionForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadStoreProducts();
    this.loadDepartments();
  }

  loadStoreProducts(): void {
    this.storeProductService.getAllStoreProducts({ isActive: true }).subscribe(
      (products) => {
        this.storeProducts = products;
      },
      () => {
        this.toast.error('Error loading store products');
      },
    );
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe(
      (departments) => {
        this.departments = departments;
      },
      () => {},
    );
  }

  addItem(): void {
    this.items.push(
      this.fb.group({
        storeProductId: ['', Validators.required],
        quantityRequested: ['', [Validators.required, Validators.min(1)]],
        notes: [''],
      }),
    );
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  closeModal() {
    this.close();
  }

  buildPayload(): any {
    const formVal = this.requisitionForm.value;
    return {
      departmentId: formVal.departmentId
        ? Number(formVal.departmentId)
        : undefined,
      priority: formVal.priority,
      purpose: formVal.purpose || undefined,
      notes: formVal.notes || undefined,
      items: formVal.items.map((item: any) => ({
        storeProductId: Number(item.storeProductId),
        quantityRequested: Number(item.quantityRequested),
        notes: item.notes || undefined,
      })),
    };
  }

  onSubmit() {
    if (this.requisitionForm.valid && this.items.length > 0) {
      this.loading = true;
      this.requisitionService.addRequisition(this.buildPayload()).subscribe(
        () => {
          this.loading = false;
          this.toast.success('Requisition created successfully');
          this.closeModal();
        },
        (error) => {
          this.loading = false;
          this.toast.error(
            error.error?.message || 'Error creating requisition',
          );
        },
      );
    }
  }

  updateRequisition() {
    if (this.requisitionForm.valid && this.items.length > 0) {
      this.loading = true;
      this.requisitionService
        .updateRequisition(this.requisition!.id, this.buildPayload())
        .subscribe(
          () => {
            this.loading = false;
            this.toast.success('Requisition updated successfully');
            this.closeModal();
          },
          (error) => {
            this.loading = false;
            this.toast.error(
              error.error?.message || 'Error updating requisition',
            );
          },
        );
    }
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateRequisition();
    } else {
      this.onSubmit();
    }
  }
}
