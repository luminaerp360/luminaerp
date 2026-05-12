// reports.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiBaseUrl = `${environment.apiRootUrl}reports/`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Fetches comprehensive report data
   * @param organizationId - The organization ID
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param includeOneTimeProducts - Whether to include one-time products
   * @returns Observable of comprehensive report data
   */
  getComprehensiveReport(
    organizationId: number,
    startDate: string,
    endDate: string,
    includeOneTimeProducts: boolean = true
  ): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('includeOneTimeProducts', includeOneTimeProducts.toString());

    return this.http.get<any>(`${this.apiBaseUrl}comprehensive`, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Fetches daily reports data
   * @param organizationId - The organization ID
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Observable of daily report data
   */
  getDailyReport(
    organizationId: number,
    startDate: string,
    endDate: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any>(`${this.apiBaseUrl}daily`, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Fetches one-time products report data
   * @param organizationId - The organization ID
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Observable of one-time products report data
   */
  getOneTimeProductsReport(
    organizationId: number,
    startDate: string,
    endDate: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any>(`${this.apiBaseUrl}one-time-products`, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Fetches VAT and discount report data
   * @param organizationId - The organization ID
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Observable of VAT and discount report data
   */
  getVatAndDiscountReport(
    organizationId: number,
    startDate: string,
    endDate: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any>(`${this.apiBaseUrl}vat-discount`, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Generate and download a PDF report
   * @param reportData - The report data
   * @param reportType - The type of report
   * @param organizationId - The organization ID
   * @returns Observable of the PDF blob
   */
  generatePdfReport(
    reportData: any,
    reportType: string = 'comprehensive',
    organizationId: number
  ): Observable<Blob> {
    return this.http.post(
      `${this.apiBaseUrl}generate-pdf`,
      { reportData, reportType },
      {
        responseType: 'blob',
        headers: this.getHeaders(),
      }
    );
  }

  /**
   * Export report data to CSV
   * @param reportData - The report data
   * @param reportType - The type of report
   * @returns Observable of the CSV blob
   */
  exportToCsv(
    reportData: any,
    reportType: string = 'comprehensive'
  ): Observable<Blob> {
    return this.http.post(
      `${this.apiBaseUrl}export-csv`,
      { reportData, reportType },
      {
        responseType: 'blob',
        headers: this.getHeaders(),
      }
    );
  }
}
