import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { Supplier } from '../interfaces/supplier.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SuppliersService {
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}suppliers`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllSupplier(): Observable<Supplier[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<Supplier[]>(url, { headers: this.getHeaders() });
  }

  addSupplier(supplier: Supplier): Observable<Supplier> {
    const url = `${this.apiUrl}`;
    return this.http.post<Supplier>(url, supplier, { headers: this.getHeaders() });
  }

  getSupplierbyId(id: string): Observable<Supplier> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Supplier>(url, { headers: this.getHeaders() });
  }

  updateSupplier(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteSupplier(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}