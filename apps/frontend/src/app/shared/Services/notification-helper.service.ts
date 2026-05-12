import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { NotificationType } from './notifications.service';

export interface CreateNotificationDto {
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  icon?: string | null;
  data?: any | null;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationHelperService {
  private apiUrl = environment.apiMainRootUrl;

  constructor(private http: HttpClient) {}

  /**
   * Create a system notification
   */
  createSystemNotification(
    organizationId: string,
    title: string,
    message: string,
    link?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      type: NotificationType.SYSTEM,
      title,
      message,
      link,
    });
  }

  /**
   * Create a sale notification
   */
  createSaleNotification(
    organizationId: string,
    saleId: string,
    amount: number,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.SALE,
      title: 'New Sale Completed',
      message: `A new sale of ${amount.toFixed(2)} has been completed`,
      link: `/sales/${saleId}`,
      data: { saleId, amount },
    });
  }

  /**
   * Create an invoice notification
   */
  createInvoiceNotification(
    organizationId: string,
    invoiceId: string,
    invoiceNumber: string,
    customerName: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.INVOICE,
      title: 'New Invoice Created',
      message: `Invoice ${invoiceNumber} has been created for ${customerName}`,
      link: `/invoices/${invoiceId}`,
      data: { invoiceId, invoiceNumber, customerName },
    });
  }

  /**
   * Create a payment notification
   */
  createPaymentNotification(
    organizationId: string,
    amount: number,
    paymentMethod: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.PAYMENT,
      title: 'Payment Received',
      message: `Payment of ${amount.toFixed(2)} received via ${paymentMethod}`,
      data: { amount, paymentMethod },
    });
  }

  /**
   * Create an inventory alert notification
   */
  createInventoryAlert(
    organizationId: string,
    productName: string,
    currentStock: number,
    reorderLevel: number,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.INVENTORY,
      title: 'Low Stock Alert',
      message: `${productName} is running low (${currentStock} remaining, reorder level: ${reorderLevel})`,
      link: '/inventory',
      data: { productName, currentStock, reorderLevel },
    });
  }

  /**
   * Create a user notification
   */
  createUserNotification(
    organizationId: string,
    userId: string,
    title: string,
    message: string,
    link?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.USER,
      title,
      message,
      link,
    });
  }

  /**
   * Create a ticket notification
   */
  createTicketNotification(
    organizationId: string,
    ticketId: string,
    ticketSubject: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.TICKET,
      title: 'New Support Ticket',
      message: `New ticket: ${ticketSubject}`,
      link: `/tickets/${ticketId}`,
      data: { ticketId, ticketSubject },
    });
  }

  /**
   * Create an alert notification
   */
  createAlert(
    organizationId: string,
    title: string,
    message: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.ALERT,
      title,
      message,
    });
  }

  /**
   * Create an info notification
   */
  createInfo(
    organizationId: string,
    title: string,
    message: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.INFO,
      title,
      message,
    });
  }

  /**
   * Create a warning notification
   */
  createWarning(
    organizationId: string,
    title: string,
    message: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.WARNING,
      title,
      message,
    });
  }

  /**
   * Create an error notification
   */
  createError(
    organizationId: string,
    title: string,
    message: string,
    userId?: string,
  ): Observable<any> {
    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.ERROR,
      title,
      message,
    });
  }

  /**
   * Generic method to create a notification
   */
  private createNotification(
    organizationId: string,
    dto: CreateNotificationDto,
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}organizations/${organizationId}/notifications`,
      dto,
    );
  }
}
