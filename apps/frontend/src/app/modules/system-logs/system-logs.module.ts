import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SystemLogsListComponent } from './components/system-logs-list/system-logs-list.component';
import { SystemLogsStatsComponent } from './components/system-logs-stats/system-logs-stats.component';
import { UserActivityComponent } from './components/user-activity/user-activity.component';

const routes: Routes = [
  {
    path: '',
    component: SystemLogsListComponent,
  },
  {
    path: 'stats',
    component: SystemLogsStatsComponent,
  },
  {
    path: 'user/:userId',
    component: UserActivityComponent,
  },
];

@NgModule({
  declarations: [
    SystemLogsListComponent,
    SystemLogsStatsComponent,
    UserActivityComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class SystemLogsModule {}
