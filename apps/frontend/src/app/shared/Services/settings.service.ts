import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../Environments/environments';
import {
  OrganizationSettings,
  CreateSettingsDto,
  UpdateSettingsDto,
  SettingsSection,
  PaymentMethodsConfig,
  TaxSettings,
  CurrencySettings,
  DateTimeSettings,
  FiscalYearSettings,
  ReportingPeriodSettings,
} from '../interfaces/settings.interface';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = `${environment.apiMainRootUrl}settings`;
  private settingsCache$ = new BehaviorSubject<OrganizationSettings | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get current organization ID from local storage
   */
  private getOrganizationId(): number {
    const orgId = localStorage.getItem('licencedOrg');
    return orgId ? parseInt(orgId, 10) : 0;
  }

  /**
   * Get organization settings (with caching)
   */
  getSettings(refresh: boolean = false): Observable<OrganizationSettings> {
    const orgId = this.getOrganizationId();

    if (!refresh && this.settingsCache$.value) {
      return of(this.settingsCache$.value);
    }

    return this.http
      .get<OrganizationSettings>(`${this.apiUrl}/organization/${orgId}`)
      .pipe(
        tap((settings) => {
          this.settingsCache$.next(settings);
          // Store in local storage for offline access
          localStorage.setItem('orgSettings', JSON.stringify(settings));
        }),
        catchError((error) => {
          console.error('Error fetching settings:', error);
          // Try to get from local storage
          const cached = localStorage.getItem('orgSettings');
          if (cached) {
            const settings = JSON.parse(cached);
            this.settingsCache$.next(settings);
            return of(settings);
          }
          throw error;
        })
      );
  }

  /**
   * Get settings observable for reactive updates
   */
  getSettings$(): Observable<OrganizationSettings | null> {
    return this.settingsCache$.asObservable();
  }

  /**
   * Get cached settings synchronously
   */
  getCachedSettings(): OrganizationSettings | null {
    return this.settingsCache$.value;
  }

  /**
   * Create organization settings
   */
  createSettings(dto: CreateSettingsDto): Observable<OrganizationSettings> {
    return this.http.post<OrganizationSettings>(this.apiUrl, dto).pipe(
      tap((settings) => {
        this.settingsCache$.next(settings);
        localStorage.setItem('orgSettings', JSON.stringify(settings));
      })
    );
  }

  /**
   * Update organization settings
   */
  updateSettings(dto: UpdateSettingsDto): Observable<OrganizationSettings> {
    const orgId = this.getOrganizationId();
    return this.http.put<OrganizationSettings>(`${this.apiUrl}/organization/${orgId}`, dto).pipe(
      tap((settings) => {
        this.settingsCache$.next(settings);
        localStorage.setItem('orgSettings', JSON.stringify(settings));
      })
    );
  }

  /**
   * Update specific settings section
   */
  updateSection(section: SettingsSection, data: Partial<UpdateSettingsDto>): Observable<OrganizationSettings> {
    const orgId = this.getOrganizationId();
    return this.http
      .patch<OrganizationSettings>(`${this.apiUrl}/organization/${orgId}/section/${section}`, data)
      .pipe(
        tap((settings) => {
          this.settingsCache$.next(settings);
          localStorage.setItem('orgSettings', JSON.stringify(settings));
        })
      );
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): Observable<OrganizationSettings> {
    const orgId = this.getOrganizationId();
    return this.http.post<OrganizationSettings>(`${this.apiUrl}/organization/${orgId}/reset`, {}).pipe(
      tap((settings) => {
        this.settingsCache$.next(settings);
        localStorage.setItem('orgSettings', JSON.stringify(settings));
      })
    );
  }

  /**
   * Get payment methods configuration
   */
  getPaymentMethods(): Observable<PaymentMethodsConfig> {
    const orgId = this.getOrganizationId();
    return this.http.get<PaymentMethodsConfig>(`${this.apiUrl}/organization/${orgId}/payment-methods`);
  }

  /**
   * Update payment methods configuration
   */
  updatePaymentMethods(paymentMethods: Partial<PaymentMethodsConfig>): Observable<OrganizationSettings> {
    const orgId = this.getOrganizationId();
    return this.http
      .patch<OrganizationSettings>(`${this.apiUrl}/organization/${orgId}/payment-methods`, paymentMethods)
      .pipe(
        tap((settings) => {
          this.settingsCache$.next(settings);
          localStorage.setItem('orgSettings', JSON.stringify(settings));
        })
      );
  }

  /**
   * Get tax settings
   */
  getTaxSettings(): Observable<TaxSettings> {
    const orgId = this.getOrganizationId();
    return this.http.get<TaxSettings>(`${this.apiUrl}/organization/${orgId}/tax`);
  }

  /**
   * Get document prefix
   */
  getPrefix(type: 'invoice' | 'sale' | 'quotation' | 'lpo' | 'payment' | 'expense' | 'creditSale'): Observable<string> {
    const orgId = this.getOrganizationId();
    return this.http
      .get<{ prefix: string }>(`${this.apiUrl}/organization/${orgId}/prefix/${type}`)
      .pipe(
        tap((result) => result.prefix),
        catchError(() => of(''))
      ) as any;
  }

  /**
   * Get currency settings
   */
  getCurrencySettings(): Observable<CurrencySettings> {
    const orgId = this.getOrganizationId();
    return this.http.get<CurrencySettings>(`${this.apiUrl}/organization/${orgId}/currency`);
  }

  /**
   * Get date/time format settings
   */
  getDateTimeSettings(): Observable<DateTimeSettings> {
    const orgId = this.getOrganizationId();
    return this.http.get<DateTimeSettings>(`${this.apiUrl}/organization/${orgId}/datetime`);
  }

  /**
   * Get fiscal year settings
   */
  getFiscalYearSettings(): Observable<FiscalYearSettings> {
    const orgId = this.getOrganizationId();
    return this.http.get<FiscalYearSettings>(`${this.apiUrl}/organization/${orgId}/fiscal-year`);
  }

  /**
   * Get reporting period settings
   */
  getReportingPeriodSettings(): Observable<ReportingPeriodSettings> {
    const orgId = this.getOrganizationId();
    return this.http.get<ReportingPeriodSettings>(`${this.apiUrl}/organization/${orgId}/reporting-period`);
  }

  /**
   * Helper: Format currency based on settings
   */
  formatCurrency(amount: number, settings?: OrganizationSettings): string {
    const s = settings || this.settingsCache$.value;
    if (!s) return `KSh ${amount.toFixed(2)}`;

    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: s.currency,
      minimumFractionDigits: s.decimalPlaces,
      maximumFractionDigits: s.decimalPlaces,
    }).format(amount);
  }

  /**
   * Helper: Format date based on settings
   */
  formatDate(date: Date | string, settings?: OrganizationSettings): string {
    const s = settings || this.settingsCache$.value;
    const d = typeof date === 'string' ? new Date(date) : date;

    if (!s) {
      return d.toLocaleDateString();
    }

    // Convert format string to Intl.DateTimeFormat options
    const formatOptions = this.parseDateFormat(s.dateFormat);
    return new Intl.DateTimeFormat('en-KE', formatOptions).format(d);
  }

  /**
   * Helper: Format time based on settings
   */
  formatTime(date: Date | string, settings?: OrganizationSettings): string {
    const s = settings || this.settingsCache$.value;
    const d = typeof date === 'string' ? new Date(date) : date;

    if (!s) {
      return d.toLocaleTimeString();
    }

    const hour12 = s.timeFormat === '12h' || s.timeFormat.includes('a') || s.timeFormat.includes('A');

    return new Intl.DateTimeFormat('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: hour12,
    }).format(d);
  }

  /**
   * Helper: Get month names for fiscal year
   */
  getMonthNames(): string[] {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
  }

  /**
   * Helper: Parse date format string to DateTimeFormat options
   */
  private parseDateFormat(format: string): Intl.DateTimeFormatOptions {
    const options: Intl.DateTimeFormatOptions = {};

    if (format.includes('YYYY') || format.includes('yyyy')) {
      options.year = 'numeric';
    } else if (format.includes('YY') || format.includes('yy')) {
      options.year = '2-digit';
    }

    if (format.includes('MMMM')) {
      options.month = 'long';
    } else if (format.includes('MMM')) {
      options.month = 'short';
    } else if (format.includes('MM')) {
      options.month = '2-digit';
    } else if (format.includes('M')) {
      options.month = 'numeric';
    }

    if (format.includes('DD') || format.includes('dd')) {
      options.day = '2-digit';
    } else if (format.includes('D') || format.includes('d')) {
      options.day = 'numeric';
    }

    return options;
  }
}
