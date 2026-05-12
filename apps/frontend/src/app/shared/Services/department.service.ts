import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { Department } from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}departments`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl, {
      headers: this.getHeaders(),
    });
  }

  getDepartmentById(id: number): Observable<Department> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Department>(url, { headers: this.getHeaders() });
  }

  addDepartment(department: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department, {
      headers: this.getHeaders(),
    });
  }

  updateDepartment(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.patch<Department>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
