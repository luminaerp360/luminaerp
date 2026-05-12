import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import {
  Requisition,
  RequisitionStatus,
  RequisitionPriority,
} from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class RequisitionService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}requisitions`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllRequisitions(query?: {
    status?: RequisitionStatus;
    departmentId?: number;
    priority?: RequisitionPriority;
    startDate?: string;
    endDate?: string;
  }): Observable<Requisition[]> {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.departmentId)
      params = params.set('departmentId', query.departmentId.toString());
    if (query?.priority) params = params.set('priority', query.priority);
    if (query?.startDate) params = params.set('startDate', query.startDate);
    if (query?.endDate) params = params.set('endDate', query.endDate);
    return this.http.get<Requisition[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getRequisitionById(id: number): Observable<Requisition> {
    return this.http.get<Requisition>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  addRequisition(data: any): Observable<Requisition> {
    return this.http.post<Requisition>(this.apiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  updateRequisition(id: number, data: any): Observable<Requisition> {
    return this.http.patch<Requisition>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  approveRequisition(
    id: number,
    items?: { id: number; quantityApproved: number }[],
  ): Observable<Requisition> {
    const body = items ? { items } : {};
    return this.http.patch<Requisition>(`${this.apiUrl}/${id}/approve`, body, {
      headers: this.getHeaders(),
    });
  }

  rejectRequisition(id: number, reason: string): Observable<Requisition> {
    return this.http.patch<Requisition>(
      `${this.apiUrl}/${id}/reject`,
      { reason },
      {
        headers: this.getHeaders(),
      },
    );
  }

  issueRequisition(
    id: number,
    items?: { id: number; quantityIssued: number }[],
  ): Observable<Requisition> {
    const body = items ? { items } : {};
    return this.http.patch<Requisition>(`${this.apiUrl}/${id}/issue`, body, {
      headers: this.getHeaders(),
    });
  }

  cancelRequisition(id: number): Observable<Requisition> {
    return this.http.patch<Requisition>(
      `${this.apiUrl}/${id}/cancel`,
      {},
      {
        headers: this.getHeaders(),
      },
    );
  }

  deleteRequisition(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
