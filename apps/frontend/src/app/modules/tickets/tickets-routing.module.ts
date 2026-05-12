import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../shared/Guards/auth.guard';
import { TicketListComponent } from './components/ticket-list/ticket-list.component';
import { CreateTicketComponent } from './components/create-ticket/create-ticket.component';
import { TicketDetailComponent } from './components/ticket-detail/ticket-detail.component';

const routes: Routes = [
  {
    path: '',
    component: TicketListComponent,
  },
  {
    path: 'create',
    component: CreateTicketComponent,
  },
  {
    path: ':id',
    component: TicketDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TicketsRoutingModule {}
