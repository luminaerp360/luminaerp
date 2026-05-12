import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SALE = 'SALE',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  INVENTORY = 'INVENTORY',
  USER = 'USER',
  TICKET = 'TICKET',
  ALERT = 'ALERT',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface Notification {
  id: string;
  organizationId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  icon: string | null;
  isRead: boolean;
  readAt: Date | null;
  data: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationFilter {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private apiUrl = environment.apiMainRootUrl;

  constructor(private http: HttpClient) {}

  getNotifications(
    organizationId: string,
    filters?: NotificationFilter,
  ): Observable<NotificationResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.isRead !== undefined)
        params = params.set('isRead', filters.isRead.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<NotificationResponse>(
      `${this.apiUrl}organizations/${organizationId}/notifications`,
      { params },
    );
  }

  getUnreadCount(organizationId: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}organizations/${organizationId}/notifications/unread-count`,
    );
  }

  getNotificationById(
    organizationId: string,
    notificationId: string,
  ): Observable<Notification> {
    return this.http.get<Notification>(
      `${this.apiUrl}organizations/${organizationId}/notifications/${notificationId}`,
    );
  }

  markAsRead(
    organizationId: string,
    notificationId: string,
  ): Observable<Notification> {
    return this.http.patch<Notification>(
      `${this.apiUrl}organizations/${organizationId}/notifications/${notificationId}/read`,
      {},
    );
  }

  markAllAsRead(organizationId: string): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(
      `${this.apiUrl}organizations/${organizationId}/notifications/mark-all-read`,
      {},
    );
  }

  deleteNotification(
    organizationId: string,
    notificationId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}organizations/${organizationId}/notifications/${notificationId}`,
    );
  }

  cleanupOldNotifications(
    organizationId: string,
    daysOld: number = 30,
  ): Observable<{ count: number }> {
    return this.http.delete<{ count: number }>(
      `${this.apiUrl}organizations/${organizationId}/notifications/cleanup/old`,
      { params: { daysOld: daysOld.toString() } },
    );
  }

  getIconClass(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.SYSTEM]:
        'ri-settings-3-line text-gray-600 dark:text-gray-400',
      [NotificationType.SALE]:
        'ri-shopping-cart-line text-green-600 dark:text-green-400',
      [NotificationType.INVOICE]:
        'ri-file-text-line text-blue-600 dark:text-blue-400',
      [NotificationType.PAYMENT]:
        'ri-money-dollar-circle-line text-green-600 dark:text-green-400',
      [NotificationType.INVENTORY]:
        'ri-stack-line text-purple-600 dark:text-purple-400',
      [NotificationType.USER]:
        'ri-user-line text-indigo-600 dark:text-indigo-400',
      [NotificationType.TICKET]:
        'ri-ticket-line text-orange-600 dark:text-orange-400',
      [NotificationType.ALERT]:
        'ri-error-warning-line text-red-600 dark:text-red-400',
      [NotificationType.INFO]:
        'ri-information-line text-blue-600 dark:text-blue-400',
      [NotificationType.WARNING]:
        'ri-alert-line text-yellow-600 dark:text-yellow-400',
      [NotificationType.ERROR]:
        'ri-close-circle-line text-red-600 dark:text-red-400',
    };
    return (
      iconMap[type] || 'ri-notification-line text-gray-600 dark:text-gray-400'
    );
  }

  getTypeColor(type: NotificationType): string {
    const colorMap: Record<NotificationType, string> = {
      [NotificationType.SYSTEM]:
        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [NotificationType.SALE]:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [NotificationType.INVOICE]:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [NotificationType.PAYMENT]:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [NotificationType.INVENTORY]:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      [NotificationType.USER]:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      [NotificationType.TICKET]:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      [NotificationType.ALERT]:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [NotificationType.INFO]:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [NotificationType.WARNING]:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      [NotificationType.ERROR]:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      colorMap[type] ||
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    );
  }
}
