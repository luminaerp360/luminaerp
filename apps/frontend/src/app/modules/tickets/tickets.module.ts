import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TicketsRoutingModule } from './tickets-routing.module';

import { TicketListComponent } from './components/ticket-list/ticket-list.component';
import { CreateTicketComponent } from './components/create-ticket/create-ticket.component';
import { TicketDetailComponent } from './components/ticket-detail/ticket-detail.component';

@NgModule({
  declarations: [
    TicketListComponent,
    CreateTicketComponent,
    TicketDetailComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, TicketsRoutingModule],
})
export class TicketsModule {}
