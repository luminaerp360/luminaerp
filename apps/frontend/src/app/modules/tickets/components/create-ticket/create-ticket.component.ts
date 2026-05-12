import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TicketsService,
  TicketPriority,
  TicketCategory,
  CreateTicketDto,
} from '../../../../shared/Services/tickets.service';

@Component({
  selector: 'app-create-ticket',
  templateUrl: './create-ticket.component.html',
  styleUrls: ['./create-ticket.component.css'],
})
export class CreateTicketComponent implements OnInit {
  ticketForm: FormGroup;
  isSubmitting = false;

  priorities = Object.values(TicketPriority);
  categories = Object.values(TicketCategory);

  constructor(
    private fb: FormBuilder,
    private ticketsService: TicketsService,
    private router: Router,
  ) {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: [TicketPriority.MEDIUM, Validators.required],
      category: [TicketCategory.OTHER, Validators.required],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      Object.keys(this.ticketForm.controls).forEach((key) => {
        this.ticketForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    const userData = localStorage.getItem('user');
    if (!userData) {
      console.error('User not found');
      this.isSubmitting = false;
      return;
    }

    const user = JSON.parse(userData);
    const dto: CreateTicketDto = {
      userId: user.id,
      ...this.ticketForm.value,
    };

    this.ticketsService.createTicket(dto).subscribe({
      next: (ticket) => {
        console.log('Ticket created:', ticket);
        this.isSubmitting = false;
        // Navigate to ticket list or detail
        this.router.navigate(['/tickets']);
      },
      error: (error) => {
        console.error('Error creating ticket:', error);
        this.isSubmitting = false;
      },
    });
  }

  getCategoryLabel(category: string): string {
    return category.replace(/_/g, ' ');
  }
}
