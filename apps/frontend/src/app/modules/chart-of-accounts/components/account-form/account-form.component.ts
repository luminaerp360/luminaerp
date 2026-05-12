import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChartOfAccountsService } from '../../../../shared/Services/chart-of-accounts.service';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import {
  AccountType,
  AccountCategory,
  BalanceType,
  ChartOfAccount,
} from '../../../../shared/interfaces/chart-of-accounts.interface';

@Component({
  selector: 'app-account-form',
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.scss'],
})
export class AccountFormComponent extends ModalComponent implements OnInit {
  accountForm!: FormGroup;
  loading = false;
  mode: 'create' | 'edit' = 'create';
  account?: ChartOfAccount;

  accountTypes = Object.values(AccountType);
  accountCategories = Object.values(AccountCategory);
  balanceTypes = Object.values(BalanceType);

  // Filtered categories based on selected account type
  get filteredCategories(): AccountCategory[] {
    const selectedType = this.accountForm?.get('accountType')?.value as AccountType;
    if (!selectedType || !Object.values(AccountType).includes(selectedType)) return [];

    const categoryMap: Record<AccountType, AccountCategory[]> = {
      [AccountType.ASSET]: [
        AccountCategory.CURRENT_ASSET,
        AccountCategory.FIXED_ASSET,
        AccountCategory.INTANGIBLE_ASSET,
      ],
      [AccountType.LIABILITY]: [
        AccountCategory.CURRENT_LIABILITY,
        AccountCategory.LONG_TERM_LIABILITY,
      ],
      [AccountType.EQUITY]: [AccountCategory.EQUITY],
      [AccountType.REVENUE]: [
        AccountCategory.OPERATING_REVENUE,
        AccountCategory.NON_OPERATING_REVENUE,
      ],
      [AccountType.EXPENSE]: [
        AccountCategory.COST_OF_SALES,
        AccountCategory.OPERATING_EXPENSE,
        AccountCategory.FINANCIAL_EXPENSE,
      ],
    };

    return categoryMap[selectedType] || [];
  }

  constructor(
    private fb: FormBuilder,
    private chartOfAccountsService: ChartOfAccountsService
  ) {
    super();
  }

  ngOnInit(): void {
    const payload = this.dialogRemoteControl.payload;
    this.mode = payload?.mode || 'create';
    this.account = payload?.account;
    this.initializeForm();

    // Reset category when account type changes
    this.accountForm.get('accountType')?.valueChanges.subscribe(() => {
      this.accountForm.get('accountCategory')?.setValue('');
    });
  }

  initializeForm() {
    this.accountForm = this.fb.group({
      accountCode: [
        this.account?.accountCode || '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(10)],
      ],
      accountName: [
        this.account?.accountName || '',
        [Validators.required, Validators.maxLength(255)],
      ],
      accountType: [
        this.account?.accountType || AccountType.ASSET,
        Validators.required,
      ],
      accountCategory: [
        this.account?.accountCategory || '',
        Validators.required,
      ],
      balanceType: [
        this.account?.balanceType || BalanceType.DEBIT,
        Validators.required,
      ],
      description: [this.account?.description || ''],
      isActive: [this.account?.isActive ?? true],
    });
  }

  onSubmit() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.accountForm.value;

    const operation =
      this.mode === 'create'
        ? this.chartOfAccountsService.createAccount(formValue)
        : this.chartOfAccountsService.updateAccount(this.account!.id, formValue);

    operation.subscribe({
      next: () => {
        this.loading = false;
        // Small delay to ensure the accountsChanged event is processed
        setTimeout(() => {
          this.close({ success: true });
        }, 100);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving account:', error);
        alert(error.error?.message || 'Failed to save account');
      },
    });
  }

  formatCategory(category: string): string {
    return category.replace(/_/g, ' ');
  }
}
