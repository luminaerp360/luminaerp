import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  SystemLogsService,
  SystemLog,
  FilterSystemLogsDto,
  LogAction,
  LogModule,
} from '../../../../shared/Services/system-logs.service';

@Component({
  selector: 'app-system-logs-list',
  templateUrl: './system-logs-list.component.html',
  styleUrls: ['./system-logs-list.component.css'],
})
export class SystemLogsListComponent implements OnInit {
  logs: SystemLog[] = [];
  isLoading = false;
  filterForm: FormGroup;

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalLogs = 0;
  totalPages = 0;

  // Enums for dropdowns
  logActions = Object.values(LogAction);
  logModules = Object.values(LogModule);

  // Expose Math to template
  Math = Math;

  constructor(
    private systemLogsService: SystemLogsService,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      action: [''],
      module: [''],
      userId: [''],
      startDate: [''],
      endDate: [''],
      entityType: [''],
      entityId: [''],
    });
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    const filters: FilterSystemLogsDto = {
      ...this.filterForm.value,
      page: this.currentPage,
      limit: this.pageSize,
    };

    // Remove empty filters
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof FilterSystemLogsDto] === '') {
        delete filters[key as keyof FilterSystemLogsDto];
      }
    });

    this.systemLogsService.getLogs(filters).subscribe({
      next: (response) => {
        this.logs = response.data;
        this.totalLogs = response.total;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadLogs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  getActionClass(action: LogAction): string {
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getUserName(log: SystemLog): string {
    if (log.user) {
      return log.user.fullName;
    }
    return 'Unknown User';
  }

  exportLogs(): void {
    // TODO: Implement CSV export
    console.log('Export logs functionality');
  }
}
