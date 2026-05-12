import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  TicketsService,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  FilterTicketsDto,
} from '../../../../shared/Services/tickets.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-ticket-list',
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.css'],
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  isLoading = false;
  filterForm: FormGroup;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalTickets = 0;
  totalPages = 0;

  // Enums for dropdowns
  statuses = Object.values(TicketStatus);
  priorities = Object.values(TicketPriority);
  categories = Object.values(TicketCategory);

  // Expose Math to template
  Math = Math;

  constructor(
    private ticketsService: TicketsService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      status: [''],
      priority: [''],
      category: [''],
    });
  }

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading = true;
    const filters: FilterTicketsDto = {
      ...this.filterForm.value,
      page: this.currentPage,
      limit: this.pageSize,
    };

    // Remove empty filters
    Object.keys(filters).forEach((key) => {
      const value = filters[key as keyof FilterTicketsDto];
      if (!value && value !== 0) {
        delete filters[key as keyof FilterTicketsDto];
      }
    });

    this.ticketsService.getTickets(filters).subscribe({
      next: (response) => {
        this.tickets = response.data;
        this.totalTickets = response.total;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tickets:', error);
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTickets();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadTickets();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTickets();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTickets();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTickets();
    }
  }

  viewTicket(ticketId: number): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  createTicket(): void {
    this.router.navigate(['/tickets/create']);
  }

  getStatusClass(status: TicketStatus): string {
    const classes: Record<string, string> = {
      OPEN: 'badge-primary',
      IN_PROGRESS: 'badge-warning',
      RESOLVED: 'badge-success',
      CLOSED: 'badge-secondary',
    };
    return classes[status] || 'badge-secondary';
  }

  getPriorityClass(priority: TicketPriority): string {
    const classes: Record<string, string> = {
      LOW: 'badge-info',
      MEDIUM: 'badge-primary',
      HIGH: 'badge-warning',
      URGENT: 'badge-danger',
    };
    return classes[priority] || 'badge-secondary';
  }

  getCategoryLabel(category: string): string {
    return category.replace(/_/g, ' ');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }
}
