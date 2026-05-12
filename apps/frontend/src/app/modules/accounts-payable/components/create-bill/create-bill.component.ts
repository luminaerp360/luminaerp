import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { AccountsPayableService } from '../../../../shared/Services/accounts-payable.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { ChartOfAccountsService } from '../../../../shared/Services/chart-of-accounts.service';
import {
  CreateBillDto,
  CreateBillItemDto,
  ExpenseAccount,
} from '../../../../types/bill.types';
import { AuthService } from '../../../../shared/Services/auth.service';

@Component({
  selector: 'app-create-bill',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-bill.component.html',
  styleUrls: ['./create-bill.component.scss'],
})
export class CreateBillComponent implements OnInit {
  billForm!: FormGroup;
  suppliers: { id: number; name: string }[] = [];
  expenseAccounts: ExpenseAccount[] = [];
  loading = false;
  submitting = false;
  billId?: number;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private toast: HotToastService,
    private accountsPayableService: AccountsPayableService,
    private suppliersService: SuppliersService,
    private chartOfAccountsService: ChartOfAccountsService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadSuppliers();
    this.loadExpenseAccounts();

    // Check if edit mode
    this.billId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.billId) {
      this.isEditMode = true;
      this.loadBill(this.billId);
    }
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    this.billForm = this.fb.group({
      supplierId: ['', Validators.required],
      billNumber: ['', [Validators.required, Validators.minLength(3)]],
      billDate: [today, Validators.required],
      dueDate: [dueDate.toISOString().split('T')[0], Validators.required],
      description: [''],
      items: this.fb.array([this.createItemFormGroup()], Validators.required),
      taxAmount: [0, Validators.min(0)],
      discountAmount: [0, Validators.min(0)],
      referenceNumber: [''],
      notes: [''],
      termsAndConditions: [''],
    });

    // Auto-generate bill number
    this.generateBillNumber();
  }

  private createItemFormGroup(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0, Validators.min(0)],
      discountAmount: [0, Validators.min(0)],
      expenseAccountId: [null],
      productId: [null],
      productName: [''],
      sku: [''],
      notes: [''],
    });
  }

  get items(): FormArray {
    return this.billForm.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      this.toast.error('Bill must have at least one item');
    }
  }

  duplicateItem(index: number): void {
    const itemValue = this.items.at(index).value;
    const newItem = this.createItemFormGroup();
    newItem.patchValue({
      ...itemValue,
      description: `${itemValue.description} (Copy)`,
    });
    this.items.insert(index + 1, newItem);
  }

  calculateItemSubtotal(index: number): number {
    const item = this.items.at(index).value;
    return (item.quantity || 0) * (item.unitPrice || 0);
  }

  calculateItemTax(index: number): number {
    const subtotal = this.calculateItemSubtotal(index);
    const item = this.items.at(index).value;
    return subtotal * ((item.taxRate || 0) / 100);
  }

  calculateItemTotal(index: number): number {
    const subtotal = this.calculateItemSubtotal(index);
    const taxAmount = this.calculateItemTax(index);
    const item = this.items.at(index).value;
    const discountAmount = item.discountAmount || 0;
    return subtotal + taxAmount - discountAmount;
  }

  calculateSubtotal(): number {
    return this.items.controls.reduce((sum, control, index) => {
      return sum + this.calculateItemSubtotal(index);
    }, 0);
  }

  calculateTotalTax(): number {
    const itemsTax = this.items.controls.reduce((sum, control, index) => {
      return sum + this.calculateItemTax(index);
    }, 0);
    const billTax = this.billForm.get('taxAmount')?.value || 0;
    return itemsTax + billTax;
  }

  calculateTotalDiscount(): number {
    const itemsDiscount = this.items.controls.reduce((sum, control) => {
      return sum + (control.value.discountAmount || 0);
    }, 0);
    const billDiscount = this.billForm.get('discountAmount')?.value || 0;
    return itemsDiscount + billDiscount;
  }

  calculateGrandTotal(): number {
    const subtotal = this.calculateSubtotal();
    const tax = this.calculateTotalTax();
    const discount = this.calculateTotalDiscount();
    return subtotal + tax - discount;
  }

  private loadSuppliers(): void {
    this.suppliersService.getAllSupplier().subscribe({
      next: (suppliers: any[]) => {
        this.suppliers = suppliers.map((s) => ({ id: s.id, name: s.name }));
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.toast.error('Failed to load suppliers');
      },
    });
  }

  private loadExpenseAccounts(): void {
    this.chartOfAccountsService.getExpenseAccounts().subscribe({
      next: (accounts: ExpenseAccount[]) => {
        this.expenseAccounts = accounts;
      },
      error: (error: any) => {
        console.error('Error loading expense accounts:', error);
        // Continue without expense accounts (optional field)
      },
    });
  }

  private loadBill(id: number): void {
    this.loading = true;
    // TODO: Implement getBillById in service
    // this.accountsPayableService.getBillById(id).subscribe({
    //   next: (bill) => {
    //     this.populateForm(bill);
    //     this.loading = false;
    //   },
    //   error: (error) => {
    //     this.toast.error('Failed to load bill');
    //     this.router.navigate(['/accounts-payable/bills']);
    //     this.loading = false;
    //   }
    // });
  }

  private generateBillNumber(): void {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.billForm.patchValue({
      billNumber: `BILL-${year}-${random}`,
    });
  }

  onSubmit(): void {
    if (this.billForm.invalid) {
      this.markFormGroupTouched(this.billForm);
      this.toast.error('Please fill all required fields');
      return;
    }

    const formValue = this.billForm.value;
    const currentUser = this.authService.user$.value;

    const dto: CreateBillDto = {
      supplierId: formValue.supplierId,
      billNumber: formValue.billNumber,
      billDate: formValue.billDate,
      dueDate: formValue.dueDate,
      description: formValue.description || undefined,
      items: formValue.items.map(
        (item: any, index: number): CreateBillItemDto => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          discountAmount: item.discountAmount || 0,
          expenseAccountId: item.expenseAccountId || undefined,
          productId: item.productId || undefined,
          productName: item.productName || undefined,
          sku: item.sku || undefined,
          sortOrder: index,
          notes: item.notes || undefined,
        }),
      ),
      taxAmount: formValue.taxAmount || 0,
      discountAmount: formValue.discountAmount || 0,
      referenceNumber: formValue.referenceNumber || undefined,
      notes: formValue.notes || undefined,
      termsAndConditions: formValue.termsAndConditions || undefined,
      createdBy: currentUser?.id || 1,
    };

    this.submitting = true;

    this.accountsPayableService.createBill(dto).subscribe({
      next: (bill) => {
        this.toast.success('Bill created successfully');
        this.router.navigate(['/accounts-payable/bills']);
      },
      error: (error) => {
        console.error('Error creating bill:', error);
        this.toast.error(error.error?.message || 'Failed to create bill');
        this.submitting = false;
      },
    });
  }

  cancel(): void {
    if (
      confirm(
        'Are you sure you want to cancel? All unsaved changes will be lost.',
      )
    ) {
      this.router.navigate(['/accounts-payable/bills']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string, index?: number): boolean {
    if (index !== undefined) {
      const control = this.items.at(index).get(fieldName);
      return !!(
        control &&
        control.invalid &&
        (control.dirty || control.touched)
      );
    }
    const control = this.billForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getExpenseAccountName(accountId: number): string {
    const account = this.expenseAccounts.find((a) => a.id === accountId);
    return account ? `${account.accountCode} - ${account.accountName}` : '';
  }
}
