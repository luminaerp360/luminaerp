import { Component, OnInit } from '@angular/core';
import {
  NotificationsService,
  Notification,
  NotificationType,
  NotificationFilter,
} from '../../../../shared/Services/notifications.service';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
})
export class NotificationListComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  organizationId: string = '';

  // Filters
  selectedType: string = 'ALL';
  selectedStatus: string = 'ALL';
  searchTerm: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalNotifications = 0;
  totalPages = 0;

  // Loading state
  isLoading = false;

  // Type options for filter
  notificationTypes = [
    { value: 'ALL', label: 'All Types' },
    { value: NotificationType.SYSTEM, label: 'System' },
    { value: NotificationType.SALE, label: 'Sales' },
    { value: NotificationType.INVOICE, label: 'Invoices' },
    { value: NotificationType.PAYMENT, label: 'Payments' },
    { value: NotificationType.INVENTORY, label: 'Inventory' },
    { value: NotificationType.USER, label: 'Users' },
    { value: NotificationType.TICKET, label: 'Tickets' },
    { value: NotificationType.ALERT, label: 'Alerts' },
    { value: NotificationType.INFO, label: 'Info' },
    { value: NotificationType.WARNING, label: 'Warnings' },
    { value: NotificationType.ERROR, label: 'Errors' },
  ];

  constructor(private notificationsService: NotificationsService) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.organizationId = user.organizationId;
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;

    const filters: NotificationFilter = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.selectedType !== 'ALL') {
      filters.type = this.selectedType as NotificationType;
    }

    if (this.selectedStatus !== 'ALL') {
      filters.isRead = this.selectedStatus === 'READ';
    }

    this.notificationsService
      .getNotifications(this.organizationId, filters)
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications;
          this.totalNotifications = response.total;
          this.totalPages = response.totalPages;
          this.applySearch();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
        },
      });
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.filteredNotifications = this.notifications;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredNotifications = this.notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term),
    );
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadNotifications();
  }

  onSearchChange(): void {
    this.applySearch();
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;

    this.notificationsService
      .markAsRead(this.organizationId, notification.id)
      .subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date();
        },
        error: (error) => console.error('Error marking as read:', error),
      });
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead(this.organizationId).subscribe({
      next: (response) => {
        this.notifications.forEach((n) => {
          n.isRead = true;
          n.readAt = new Date();
        });
        this.applySearch();
      },
      error: (error) => console.error('Error marking all as read:', error),
    });
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    this.notificationsService
      .deleteNotification(this.organizationId, notification.id)
      .subscribe({
        next: () => {
          this.loadNotifications();
        },
        error: (error) => console.error('Error deleting notification:', error),
      });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadNotifications();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getIconClass(notification: Notification): string {
    return this.notificationsService.getIconClass(notification.type);
  }

  getTypeColor(notification: Notification): string {
    return this.notificationsService.getTypeColor(notification.type);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return notificationDate.toLocaleString();
  }
}
