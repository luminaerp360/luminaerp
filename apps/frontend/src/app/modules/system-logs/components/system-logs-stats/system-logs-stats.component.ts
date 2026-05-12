import { Component, OnInit } from '@angular/core';
import {
  SystemLogsService,
  ActivityStats,
} from '../../../../shared/Services/system-logs.service';

@Component({
  selector: 'app-system-logs-stats',
  templateUrl: './system-logs-stats.component.html',
  styleUrls: ['./system-logs-stats.component.css'],
})
export class SystemLogsStatsComponent implements OnInit {
  stats: ActivityStats | null = null;
  isLoading = false;
  selectedDays = 7;

  byActionData: { name: string; value: number }[] = [];
  byModuleData: { name: string; value: number }[] = [];
  byDayData: { name: string; value: number }[] = [];

  constructor(private systemLogsService: SystemLogsService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.systemLogsService.getActivityStats(this.selectedDays).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.prepareChartData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.isLoading = false;
      },
    });
  }

  prepareChartData(): void {
    if (!this.stats) return;

    this.byActionData = Object.entries(this.stats.byAction).map(
      ([name, value]) => ({ name, value })
    );

    this.byModuleData = Object.entries(this.stats.byModule)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 modules

    this.byDayData = Object.entries(this.stats.byDay)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  onDaysChange(): void {
    this.loadStats();
  }

  getTopActions(): { name: string; value: number }[] {
    return this.byActionData.slice(0, 5);
  }

  getTopModules(): { name: string; value: number }[] {
    return this.byModuleData.slice(0, 5);
  }
}
