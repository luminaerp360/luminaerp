import { Component, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { ChartOfAccountsService } from '../../../../shared/Services/chart-of-accounts.service';
import { AccountFormComponent } from '../account-form/account-form.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import {
  ChartOfAccount,
  AccountType,
} from '../../../../shared/interfaces/chart-of-accounts.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-accounts-list',
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.scss'],
})
export class AccountsListComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AccountFormComponent
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AccountFormComponent
  );

  accounts: ChartOfAccount[] = [];
  filteredAccounts: ChartOfAccount[] = [];
  loading = false;
  error: string | null = null;
  searchQuery: string = '';
  selectedType: AccountType | '' = '';
  showActiveOnly: boolean = false;
  hasInitialized: boolean = false;

  // Summary metrics
  totalAccounts: number = 0;
  activeAccounts: number = 0;
  assetAccounts: number = 0;
  liabilityAccounts: number = 0;
  equityAccounts: number = 0;
  revenueAccounts: number = 0;
  expenseAccounts: number = 0;

  accountTypes = [
    { value: '', label: 'All Types' },
    { value: AccountType.ASSET, label: 'Assets' },
    { value: AccountType.LIABILITY, label: 'Liabilities' },
    { value: AccountType.EQUITY, label: 'Equity' },
    { value: AccountType.REVENUE, label: 'Revenue' },
    { value: AccountType.EXPENSE, label: 'Expenses' },
  ];

  constructor(
    private chartOfAccountsService: ChartOfAccountsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkInitialization();
    this.chartOfAccountsService.accountsChanged.subscribe(() => {
      console.log('Accounts changed, refreshing list');
      this.getAllAccounts();
    });
  }

  checkInitialization() {
    this.loading = true;
    this.chartOfAccountsService
      .getAllAccounts()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          if (response.count === 0) {
            this.hasInitialized = false;
            console.log('No accounts found, not initialized');
          } else {
            this.hasInitialized = true;
            this.accounts = response.accounts;
            console.log('Accounts loaded:', this.accounts.length, 'accounts');
            console.log('First account:', this.accounts[0]);
            this.applyFilters();
            this.calculateMetrics();
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error checking initialization:', error);
          this.hasInitialized = false;
        },
      });
  }

  initializeDefaultAccounts() {
    this.loading = true;
    this.chartOfAccountsService
      .initializeDefaultAccounts()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          console.log('Accounts initialized:', response);
          this.hasInitialized = true;
          this.getAllAccounts();
        },
        error: (error) => {
          if (error.error?.message === 'Chart of accounts already initialized for this organization') {
            // Accounts are already initialized, just refresh the list
            this.hasInitialized = true;
            this.getAllAccounts();
          } else {
            this.error = 'Failed to initialize accounts';
            console.error('Error initializing accounts:', error);
          }
        },
      });
  }

  getAllAccounts() {
    console.log('getAllAccounts called');
    this.loading = true;
    this.error = null;

    this.chartOfAccountsService
      .getAllAccounts()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          console.log('Frontend received response:', response);
          console.log('Number of accounts:', response.accounts.length);
          console.log('showActiveOnly filter:', this.showActiveOnly);
          this.accounts = response.accounts;
          this.applyFilters();
          this.calculateMetrics();
          console.log('After filtering, filteredAccounts:', this.filteredAccounts.length);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = 'Failed to fetch accounts';
          console.error('Error fetching accounts:', error);
        },
      });
  }

  applyFilters() {
    let filtered = [...this.accounts];
    console.log('Applying filters to accounts:', this.accounts.length, 'filtered before:', filtered.length);

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.accountCode.toLowerCase().includes(query) ||
          account.accountName.toLowerCase().includes(query) ||
          account.description?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (this.selectedType) {
      filtered = filtered.filter(
        (account) => account.accountType === this.selectedType
      );
    }

    // Filter by active status
    if (this.showActiveOnly) {
      filtered = filtered.filter((account) => account.isActive);
    }

    this.filteredAccounts = filtered;
    console.log('Filtered accounts:', this.filteredAccounts.length, 'hasInitialized:', this.hasInitialized, 'loading:', this.loading);
    this.cdr.detectChanges();
  }

  onSearchChange() {
    this.applyFilters();
  }

  onTypeChange() {
    this.applyFilters();
  }

  onActiveToggle() {
    this.applyFilters();
  }

  calculateMetrics() {
    this.totalAccounts = this.accounts.length;
    this.activeAccounts = this.accounts.filter((a) => a.isActive).length;
    this.assetAccounts = this.accounts.filter(
      (a) => a.accountType === AccountType.ASSET
    ).length;
    this.liabilityAccounts = this.accounts.filter(
      (a) => a.accountType === AccountType.LIABILITY
    ).length;
    this.equityAccounts = this.accounts.filter(
      (a) => a.accountType === AccountType.EQUITY
    ).length;
    this.revenueAccounts = this.accounts.filter(
      (a) => a.accountType === AccountType.REVENUE
    ).length;
    this.expenseAccounts = this.accounts.filter(
      (a) => a.accountType === AccountType.EXPENSE
    ).length;
  }

  getAccountTypeLabel(type: AccountType): string {
    const typeMap: Record<AccountType, string> = {
      [AccountType.ASSET]: 'Asset',
      [AccountType.LIABILITY]: 'Liability',
      [AccountType.EQUITY]: 'Equity',
      [AccountType.REVENUE]: 'Revenue',
      [AccountType.EXPENSE]: 'Expense',
    };
    return typeMap[type] || type;
  }

  getAccountTypeColor(type: AccountType): string {
    const colorMap: Record<AccountType, string> = {
      [AccountType.ASSET]: 'bg-green-600',
      [AccountType.LIABILITY]: 'bg-red-600',
      [AccountType.EQUITY]: 'bg-blue-600',
      [AccountType.REVENUE]: 'bg-purple-600',
      [AccountType.EXPENSE]: 'bg-orange-600',
    };
    return colorMap[type] || 'bg-gray-600';
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog({ mode: 'create' }).subscribe((resp) => {
      console.log('Dialog closed with response:', resp);
      if (resp && resp.payload) {
        console.log('Refreshing accounts list after create');
        this.getAllAccounts();
      }
    });
  }

  openEditDialog(account: ChartOfAccount) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog({ mode: 'edit', account }).subscribe((resp) => {
      console.log('Edit dialog closed with response:', resp);
      if (resp && resp.payload) {
        console.log('Refreshing accounts list after edit');
        this.getAllAccounts();
      }
    });
  }

  toggleAccountStatus(account: ChartOfAccount) {
    if (account.isSystem) {
      alert('Cannot modify system accounts');
      return;
    }

    const action = account.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this account?`)) {
      return;
    }

    this.loading = true;
    const operation = account.isActive
      ? this.chartOfAccountsService.deactivateAccount(account.id)
      : this.chartOfAccountsService.activateAccount(account.id);

    operation.pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => {
        this.getAllAccounts();
      },
      error: (error) => {
        console.error(`Error ${action}ing account:`, error);
        alert(`Failed to ${action} account`);
      },
    });
  }

  deleteAccount(account: ChartOfAccount) {
    if (account.isSystem) {
      alert('Cannot delete system accounts');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${account.accountName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.loading = true;
    this.chartOfAccountsService
      .deleteAccount(account.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.getAllAccounts();
        },
        error: (error) => {
          console.error('Error deleting account:', error);
          alert(
            error.error?.message ||
              'Failed to delete account. It may have transactions or child accounts.'
          );
        },
      });
  }

  formatBalance(balance: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(balance);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
