import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  NotificationsService,
  Notification,
} from '../../Services/notifications.service';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  recentNotifications: Notification[] = [];
  isDropdownOpen = false;
  organizationId: string = '';
  private pollSubscription?: Subscription;

  constructor(
    private notificationsService: NotificationsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.organizationId = user.organizationId;

      this.loadNotifications();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  startPolling(): void {
    // Poll every 30 seconds for new notifications
    this.pollSubscription = interval(30000)
      .pipe(
        switchMap(() =>
          this.notificationsService.getUnreadCount(this.organizationId),
        ),
      )
      .subscribe({
        next: (response) => {
          console.log('Polling - Unread count:', response.count);
          this.unreadCount = response.count;
          if (this.unreadCount > 0 && !this.isDropdownOpen) {
            this.loadRecentNotifications();
          }
        },
        error: (error) => console.error('Error polling notifications:', error),
      });
  }

  loadNotifications(): void {
    console.log('Loading notifications for org:', this.organizationId);
    this.notificationsService.getUnreadCount(this.organizationId).subscribe({
      next: (response) => {
        console.log('Initial unread count:', response.count);
        this.unreadCount = response.count;
        if (this.unreadCount > 0) {
          this.loadRecentNotifications();
        }
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
      },
    });
  }

  loadRecentNotifications(): void {
    console.log('Loading recent notifications...');
    this.notificationsService
      .getNotifications(this.organizationId, {
        isRead: false,
        limit: 5,
      })
      .subscribe({
        next: (response) => {
          console.log('Recent notifications response:', response);
          console.log('Notifications array:', response.notifications);
          this.recentNotifications = response.notifications;
          console.log(
            'Recent notifications assigned:',
            this.recentNotifications,
          );
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        },
      });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen && this.unreadCount > 0) {
      this.loadRecentNotifications();
    }
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();

    this.notificationsService
      .markAsRead(this.organizationId, notification.id)
      .subscribe({
        next: () => {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);

          // Navigate to link if provided
          if (notification.link) {
            this.isDropdownOpen = false;
            this.router.navigate([notification.link]);
          }
        },
        error: (error) => console.error('Error marking as read:', error),
      });
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead(this.organizationId).subscribe({
      next: (response) => {
        this.unreadCount = 0;
        this.recentNotifications.forEach((n) => (n.isRead = true));
      },
      error: (error) => console.error('Error marking all as read:', error),
    });
  }

  viewAllNotifications(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/notifications']);
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }
}
