// expenses.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { Expense, ExpenseCreateUpdate } from '../interfaces/expense.interface';

@Injectable({
  providedIn: 'root',
})
export class ExpensesService {
  // Observable to notify consumers when expenses change (create/update/delete)
  public expensesChanged: BehaviorSubject<void> = new BehaviorSubject<void>(
    undefined
  );
  private organizationId = 1; // Get this from your auth service
  // environment.apiRootUrl already includes `/organizations/{orgId}/` so avoid duplicating it
  private baseUrl = `${environment.apiRootUrl}expenses`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllExpenses(filters?: {
    startDate?: string;
    endDate?: string;
  }): Observable<Expense[]> {
    let params = new HttpParams();

    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<Expense[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  createExpense(expense: ExpenseCreateUpdate): Observable<Expense> {
    return this.http
      .post<Expense>(this.baseUrl, expense, { headers: this.getHeaders() })
      .pipe(tap(() => this.expensesChanged.next()));
  }

  updateExpense(id: number, expense: ExpenseCreateUpdate): Observable<Expense> {
    return this.http
      .put<Expense>(`${this.baseUrl}/${id}`, expense, {
        headers: this.getHeaders(),
      })
      .pipe(tap(() => this.expensesChanged.next()));
  }

  deleteExpense(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(tap(() => this.expensesChanged.next()));
  }
}
