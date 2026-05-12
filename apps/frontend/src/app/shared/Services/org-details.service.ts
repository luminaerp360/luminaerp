import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { environment } from '../../../Environments/environments';
import { Observable } from 'rxjs';

interface OrgDetails {
  id: number;
  name: string;
  address: string;
  branch?: string;
  contact: string;
  complementaryMessage?: string;
  logoUrl?: string;
  stations: Array<{ name: string; printerIpAddress: string }>;
  bankDetails: Array<{ bankName: string; accountNumber: string }>;
  mpesaDetails: Array<{
    type: 'till' | 'paybill';
    number: string;
    accountNumber?: string;
  }>;
}

interface SubscriptionStatus {
  isActive: boolean;
  daysRemaining: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'TRIAL';
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
}

@Injectable({
  providedIn: 'root',
})
export class OrgDetailsService {
  savedOrg: any | null = null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {}

  // Dynamic method to get current API URL
  private getApiUrl(): string {
    return `${environment.apiMainRootUrl}organization`;
  }

  getAll(): Observable<OrgDetails[]> {
    return this.http.get<OrgDetails[]>(this.getApiUrl());
  }

  getById(id: number): Observable<OrgDetails> {
    const apiUrl = this.getApiUrl();
    return this.http.get<OrgDetails>(`${apiUrl}/${id}`);
  }

  create(orgDetails: Omit<OrgDetails, 'id'>): Observable<OrgDetails> {
    const apiUrl = this.getApiUrl();
    return this.http.post<OrgDetails>(apiUrl, orgDetails);
  }

  update(id: number, orgDetails: Partial<OrgDetails>): Observable<OrgDetails> {
    const apiUrl = this.getApiUrl();
    return this.http.patch<OrgDetails>(`${apiUrl}/${id}`, orgDetails);
  }

  delete(id: number): Observable<void> {
    const apiUrl = this.getApiUrl();
    return this.http.delete<void>(`${apiUrl}/${id}`);
  }

  getSavedOrgDetails(): Observable<OrgDetails | null> {
    if (this.savedOrg) {
      return this.getById(parseInt(this.savedOrg.id, 10));
    }
    return new Observable((observer) => observer.next(null));
  }

  // New method to check subscription status
  checkSubscriptionStatus(
    organizationId: number,
  ): Observable<SubscriptionStatus> {
    const apiUrl = this.getApiUrl();
    return this.http.get<SubscriptionStatus>(
      `${apiUrl}/${organizationId}/subscription-status`,
    );
  }

  // Alternative method using license key
  checkSubscriptionStatusByLicense(
    licenseKey: string,
  ): Observable<SubscriptionStatus> {
    const apiUrl = this.getApiUrl();
    return this.http.get<SubscriptionStatus>(
      `${apiUrl}/license/${licenseKey}/status`,
    );
  }
}
