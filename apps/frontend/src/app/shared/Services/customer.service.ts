/**
 * Service for managing customer operations
 * 
 * This service provides CRUD (Create, Read, Update, Delete) operations for customer
 * management. It handles all HTTP communications with the backend API for customer-related
 * functionality.
 * 
 * @remarks
 * The service communicates with the customers endpoint of the API and returns
 * Observables for all operations to support asynchronous data handling.
 * 
 * @example
 * ```typescript
 * constructor(private customerService: CustomerService) {}
 * 
 * // Add a new customer
 * const newCustomer: Customer = {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   // ... other customer properties
 * };
 * this.customerService.addCustomer(newCustomer).subscribe(
 *   response => console.log('Customer created:', response)
 * );
 * 
 * // Get all customers
 * this.customerService.getAllCustomers().subscribe(
 *   customers => console.log('All customers:', customers)
 * );
 * 
 * // Update a customer
 * const updates = { name: 'John Smith' };
 * this.customerService.updateCustomer(1, updates).subscribe(
 *   response => console.log('Customer updated:', response)
 * );
 * ```
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../Environments/environments';
import { Customer } from '../interfaces/customer.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}customers`;
  }

   private getHeaders(): HttpHeaders {
      const token = localStorage.getItem('token');
      if (token) {
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
      } else {
        // Handle case where token is not available
        return new HttpHeaders();
      }
    }

  getAllCustomers(): Observable<Customer[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<Customer[]>(url, { headers: this.getHeaders() });
  }

  addCustomer(customerCustomer: Customer): Observable<Customer> {
    const url = `${this.apiUrl}`;
    return this.http.post<Customer>(url, customerCustomer, { headers: this.getHeaders() });
  }

  getCustomerbyId(id: number): Observable<Customer> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Customer>(url, { headers: this.getHeaders() });
  }

  updateCustomer(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}