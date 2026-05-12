import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { StoreCategory } from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreCategoryService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}store-categories`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllStoreCategories(): Observable<StoreCategory[]> {
    return this.http.get<StoreCategory[]>(this.apiUrl, {
      headers: this.getHeaders(),
    });
  }

  getStoreCategoryById(id: number): Observable<StoreCategory> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<StoreCategory>(url, { headers: this.getHeaders() });
  }

  addStoreCategory(category: Partial<StoreCategory>): Observable<StoreCategory> {
    return this.http.post<StoreCategory>(this.apiUrl, category, {
      headers: this.getHeaders(),
    });
  }

  updateStoreCategory(id: number, data: Partial<StoreCategory>): Observable<StoreCategory> {
    return this.http.patch<StoreCategory>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteStoreCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
