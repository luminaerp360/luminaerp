import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotificationListComponent } from './components/notification-list/notification-list.component';

const routes: Routes = [
  {
    path: '',
    component: NotificationListComponent,
  },
];

@NgModule({
  declarations: [NotificationListComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class NotificationsModule {}
