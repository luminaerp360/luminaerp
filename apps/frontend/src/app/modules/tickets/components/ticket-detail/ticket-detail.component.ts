import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  TicketsService,
  Ticket,
  TicketStatus,
  TicketPriority,
  CreateResponseDto,
} from '../../../../shared/Services/tickets.service';

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.css'],
})
export class TicketDetailComponent implements OnInit {
  ticket: Ticket | null = null;
  isLoading = false;
  isSubmittingResponse = false;
  responseForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketsService: TicketsService,
    private fb: FormBuilder,
  ) {
    this.responseForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const ticketId = +params['id'];
      if (ticketId) {
        this.loadTicket(ticketId);
      }
    });
  }

  loadTicket(ticketId: number): void {
    this.isLoading = true;
    this.ticketsService.getTicketById(ticketId).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ticket:', error);
        this.isLoading = false;
      },
    });
  }

  addResponse(): void {
    if (this.responseForm.invalid || !this.ticket) {
      this.responseForm.get('message')?.markAsTouched();
      return;
    }

    this.isSubmittingResponse = true;

    const userData = localStorage.getItem('user');
    if (!userData) {
      console.error('User not found');
      this.isSubmittingResponse = false;
      return;
    }

    const user = JSON.parse(userData);
    const dto: CreateResponseDto = {
      userId: user.id,
      message: this.responseForm.value.message,
      isAdmin: false,
    };

    this.ticketsService.addResponse(this.ticket.id, dto).subscribe({
      next: (response) => {
        console.log('Response added:', response);
        this.responseForm.reset();
        this.isSubmittingResponse = false;
        // Reload ticket to show new response
        this.loadTicket(this.ticket!.id);
      },
      error: (error) => {
        console.error('Error adding response:', error);
        this.isSubmittingResponse = false;
      },
    });
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

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}
