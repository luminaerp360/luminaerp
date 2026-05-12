import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../Environments/environments';
import {
  ChartOfAccount,
  CreateAccountDto,
  UpdateAccountDto,
  AccountType,
  AccountWithChildren,
  BalanceSheetAccounts,
  IncomeStatementAccounts,
} from '../interfaces/chart-of-accounts.interface';

@Injectable({
  providedIn: 'root',
})
export class ChartOfAccountsService {
  public accountsChanged: Subject<void> = new Subject<void>();
  private organizationId = 1; // Get this from your auth service
  // environment.apiRootUrl already includes `/organizations/{orgId}/` so avoid duplicating it
  private baseUrl = `${environment.apiRootUrl}chart-of-accounts`;

  constructor(private http: HttpClient) {
    console.log('ChartOfAccountsService baseUrl:', this.baseUrl);
    console.log('Environment apiRootUrl:', environment.apiRootUrl);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // Initialize default chart of accounts
  initializeDefaultAccounts(): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/initialize-default`,
        {},
        { headers: this.getHeaders() },
      )
      .pipe(tap(() => this.accountsChanged.next()));
  }

  // Get all accounts
  getAllAccounts(filters?: {
    type?: AccountType;
    isActive?: boolean;
  }): Observable<{
    success: boolean;
    count: number;
    accounts: ChartOfAccount[];
  }> {
    console.log('Service: getAllAccounts called with filters:', filters);
    let params = new HttpParams();

    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }

    return this.http
      .get<{
        success: boolean;
        count: number;
        accounts: ChartOfAccount[];
      }>(this.baseUrl, {
        headers: this.getHeaders(),
        params,
      })
      .pipe(
        tap((response) => {
          console.log('Service: getAllAccounts response:', response);
          console.log('GET request URL would be:', this.baseUrl);
        }),
      );
  }

  // Get accounts tree
  getAccountsTree(): Observable<{
    success: boolean;
    tree: AccountWithChildren[];
  }> {
    return this.http.get<{
      success: boolean;
      tree: AccountWithChildren[];
    }>(`${this.baseUrl}/tree`, {
      headers: this.getHeaders(),
    });
  }

  // Get balance sheet accounts
  getBalanceSheetAccounts(): Observable<{
    success: boolean;
    balanceSheet: BalanceSheetAccounts;
  }> {
    return this.http.get<{
      success: boolean;
      balanceSheet: BalanceSheetAccounts;
    }>(`${this.baseUrl}/balance-sheet`, {
      headers: this.getHeaders(),
    });
  }

  // Get income statement accounts
  getIncomeStatementAccounts(): Observable<{
    success: boolean;
    incomeStatement: IncomeStatementAccounts;
  }> {
    return this.http.get<{
      success: boolean;
      incomeStatement: IncomeStatementAccounts;
    }>(`${this.baseUrl}/income-statement`, {
      headers: this.getHeaders(),
    });
  }

  // Get accounts by type
  getAccountsByType(type: AccountType): Observable<{
    success: boolean;
    accountType: string;
    count: number;
    accounts: ChartOfAccount[];
  }> {
    return this.http.get<{
      success: boolean;
      accountType: string;
      count: number;
      accounts: ChartOfAccount[];
    }>(`${this.baseUrl}/by-type/${type}`, {
      headers: this.getHeaders(),
    });
  }

  // Get expense accounts
  getExpenseAccounts(): Observable<ChartOfAccount[]> {
    return this.http.get<ChartOfAccount[]>(`${this.baseUrl}/expense-accounts`, {
      headers: this.getHeaders(),
    });
  }

  // Search accounts
  searchAccounts(query: string): Observable<{
    success: boolean;
    query: string;
    count: number;
    accounts: ChartOfAccount[];
  }> {
    return this.http.get<{
      success: boolean;
      query: string;
      count: number;
      accounts: ChartOfAccount[];
    }>(`${this.baseUrl}/search`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('query', query),
    });
  }

  // Get account by ID
  getAccountById(id: number): Observable<{
    success: boolean;
    account: ChartOfAccount;
  }> {
    return this.http.get<{
      success: boolean;
      account: ChartOfAccount;
    }>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // Get account balance
  getAccountBalance(
    id: number,
    filters?: { startDate?: string; endDate?: string },
  ): Observable<any> {
    let params = new HttpParams();

    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<any>(`${this.baseUrl}/${id}/balance`, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Create account
  createAccount(account: CreateAccountDto): Observable<{
    success: boolean;
    message: string;
    account: ChartOfAccount;
  }> {
    return this.http
      .post<{
        success: boolean;
        message: string;
        account: ChartOfAccount;
      }>(this.baseUrl, account, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          console.log('Account created, emitting accountsChanged');
          console.log('POST request URL was:', this.baseUrl);
          this.accountsChanged.next();
        }),
      );
  }

  // Create bulk accounts
  createBulkAccounts(accounts: CreateAccountDto[]): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/bulk`,
        { accounts },
        { headers: this.getHeaders() },
      )
      .pipe(tap(() => this.accountsChanged.next()));
  }

  // Update account
  updateAccount(
    id: number,
    account: UpdateAccountDto,
  ): Observable<{
    success: boolean;
    message: string;
    account: ChartOfAccount;
  }> {
    return this.http
      .patch<{
        success: boolean;
        message: string;
        account: ChartOfAccount;
      }>(`${this.baseUrl}/${id}`, account, { headers: this.getHeaders() })
      .pipe(tap(() => this.accountsChanged.next()));
  }

  // Activate account
  activateAccount(id: number): Observable<any> {
    return this.http
      .patch<any>(
        `${this.baseUrl}/${id}/activate`,
        {},
        { headers: this.getHeaders() },
      )
      .pipe(tap(() => this.accountsChanged.next()));
  }

  // Deactivate account
  deactivateAccount(id: number): Observable<any> {
    return this.http
      .patch<any>(
        `${this.baseUrl}/${id}/deactivate`,
        {},
        { headers: this.getHeaders() },
      )
      .pipe(tap(() => this.accountsChanged.next()));
  }

  // Delete account
  deleteAccount(id: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http
      .delete<{
        success: boolean;
        message: string;
      }>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(tap(() => this.accountsChanged.next()));
  }
}
