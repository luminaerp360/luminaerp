import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

export enum LogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PAYMENT = 'PAYMENT',
  TRANSFER = 'TRANSFER',
  PRINT = 'PRINT',
}

export enum LogModule {
  AUTH = 'AUTH',
  USERS = 'USERS',
  PRODUCTS = 'PRODUCTS',
  CATEGORIES = 'CATEGORIES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  SUPPLIERS = 'SUPPLIERS',
  ORDERS = 'ORDERS',
  SALES = 'SALES',
  QUOTATIONS = 'QUOTATIONS',
  LPO = 'LPO',
  CREDIT_SALES = 'CREDIT_SALES',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  CHART_OF_ACCOUNTS = 'CHART_OF_ACCOUNTS',
  INVOICES = 'INVOICES',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  SETTINGS = 'SETTINGS',
  ORGANIZATION = 'ORGANIZATION',
}

export interface SystemLog {
  id: number;
  organizationId: number;
  userId: number;
  action: LogAction;
  module: LogModule;
  description: string;
  entityType?: string;
  entityId?: number;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface CreateSystemLogDto {
  userId: number;
  action: LogAction;
  module: LogModule;
  description: string;
  entityType?: string;
  entityId?: number;
  metadata?: any;
}

export interface FilterSystemLogsDto {
  action?: LogAction;
  module?: LogModule;
  userId?: number;
  startDate?: string;
  endDate?: string;
  entityType?: string;
  entityId?: number;
  page?: number;
  limit?: number;
}

export interface SystemLogsResponse {
  data: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityStats {
  totalActivities: number;
  byAction: Record<string, number>;
  byModule: Record<string, number>;
  byDay: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class SystemLogsService {
  private apiUrl = `${environment.apiRootUrl}system-logs`;

  constructor(private http: HttpClient) {}

  createLog(dto: CreateSystemLogDto): Observable<SystemLog> {
    return this.http.post<SystemLog>(this.apiUrl, dto);
  }

  getLogs(filters?: FilterSystemLogsDto): Observable<SystemLogsResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<SystemLogsResponse>(this.apiUrl, { params });
  }

  getLogById(id: number): Observable<SystemLog> {
    return this.http.get<SystemLog>(`${this.apiUrl}/${id}`);
  }

  getRecentActivity(limit: number = 10): Observable<SystemLog[]> {
    return this.http.get<SystemLog[]>(`${this.apiUrl}/recent`, {
      params: { limit: limit.toString() },
    });
  }

  getUserActivity(userId: number, limit: number = 20): Observable<SystemLog[]> {
    return this.http.get<SystemLog[]>(`${this.apiUrl}/user/${userId}`, {
      params: { limit: limit.toString() },
    });
  }

  getActivityStats(days: number = 7): Observable<ActivityStats> {
    return this.http.get<ActivityStats>(`${this.apiUrl}/stats`, {
      params: { days: days.toString() },
    });
  }

  deleteOldLogs(daysToKeep: number = 90): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cleanup`, {
      params: { daysToKeep: daysToKeep.toString() },
    });
  }

  // Helper method to automatically log activities
  logActivity(
    action: LogAction,
    module: LogModule,
    description: string,
    entityType?: string,
    entityId?: number,
    metadata?: any,
  ): void {
    const userData = localStorage.getItem('userData');
    if (!userData) return;

    const user = JSON.parse(userData);
    const dto: CreateSystemLogDto = {
      userId: user.id,
      action,
      module,
      description,
      entityType,
      entityId,
      metadata,
    };

    this.createLog(dto).subscribe({
      next: () => console.log('Activity logged successfully'),
      error: (err) => console.error('Failed to log activity:', err),
    });
  }
}
