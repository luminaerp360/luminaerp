import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  SystemLogsService,
  SystemLog,
} from '../../../../shared/Services/system-logs.service';

@Component({
  selector: 'app-user-activity',
  templateUrl: './user-activity.component.html',
  styleUrls: ['./user-activity.component.css'],
})
export class UserActivityComponent implements OnInit {
  userId!: number;
  activities: SystemLog[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private systemLogsService: SystemLogsService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.userId = +params['userId'];
      this.loadUserActivity();
    });
  }

  loadUserActivity(): void {
    this.isLoading = true;
    this.systemLogsService.getUserActivity(this.userId, 50).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user activity:', error);
        this.isLoading = false;
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getUserName(log: SystemLog): string {
    if (log.user) {
      return log.user.fullName;
    }
    return 'Unknown User';
  }

  getActionClass(action: string): string {
    const classes: Record<string, string> = {
      CREATE: 'badge-success',
      UPDATE: 'badge-info',
      DELETE: 'badge-danger',
      VIEW: 'badge-secondary',
      APPROVE: 'badge-success',
      REJECT: 'badge-danger',
      LOGIN: 'badge-primary',
      LOGOUT: 'badge-warning',
      EXPORT: 'badge-info',
      IMPORT: 'badge-info',
      PAYMENT: 'badge-success',
      TRANSFER: 'badge-warning',
      PRINT: 'badge-secondary',
    };
    return classes[action] || 'badge-secondary';
  }
}
