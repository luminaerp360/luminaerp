import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../interfaces/categories';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}categories`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllCategories(): Observable<Category[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<Category[]>(url, { headers: this.getHeaders() });
  }

  addCategory(category: Category): Observable<Category> {
    const url = `${this.apiUrl}`;
    return this.http.post<Category>(url, category, { headers: this.getHeaders() });
  }

  getCategorybyId(id: number): Observable<Category> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Category>(url, { headers: this.getHeaders() });
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}