import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { RecurringInvoiceService } from '../../../../../shared/Services/recurring-invoice.service';
import {
  RecurringInvoiceTemplate,
  RecurringStatus,
  RecurrenceFrequency,
  FrequencyLabels,
} from '../../../../../shared/interfaces/recurring-invoice.interface';
import { BaseComponent } from '../../../../../shared/components/base/base.component';

@Component({
  selector: 'app-recurring-invoices',
  templateUrl: './recurring-invoices.component.html',
  styleUrls: ['./recurring-invoices.component.scss'],
})
export class RecurringInvoicesComponent
  extends BaseComponent
  implements OnInit
{
  templates: RecurringInvoiceTemplate[] = [];
  filteredTemplates: RecurringInvoiceTemplate[] = [];
  isLoading = false;

  // Filters
  selectedStatus: RecurringStatus | 'all' = 'all';
  selectedFrequency: RecurrenceFrequency | 'all' = 'all';

  // Stats
  totalActive = 0;
  totalTemplates = 0;
  upcomingThisMonth = 0;

  // Enum for template
  RecurringStatus = RecurringStatus;
  RecurrenceFrequency = RecurrenceFrequency;
  FrequencyLabels = FrequencyLabels;

  // UI state
  openDropdowns: Set<number> = new Set();
  viewMode: 'table' | 'card' = 'table';

  constructor(public recurringService: RecurringInvoiceService) {
    super();
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading = true;

    const filters: any = {};
    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus;
    }
    if (this.selectedFrequency !== 'all') {
      filters.frequency = this.selectedFrequency;
    }

    this.recurringService.getTemplates(filters).subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.filteredTemplates = this.templates;
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.toast.error('Failed to load recurring invoices');
        this.isLoading = false;
      },
    });
  }

  calculateStats(): void {
    this.totalTemplates = this.templates.length;
    this.totalActive = this.templates.filter(
      (t) => t.status === RecurringStatus.ACTIVE,
    ).length;

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.upcomingThisMonth = this.templates.filter((t) => {
      const nextDate = new Date(t.nextInvoiceDate);
      return (
        t.status === RecurringStatus.ACTIVE &&
        nextDate >= now &&
        nextDate <= endOfMonth
      );
    }).length;
  }

  filterByStatus(status: RecurringStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadTemplates();
  }

  filterByFrequency(frequency: RecurrenceFrequency | 'all'): void {
    this.selectedFrequency = frequency;
    this.loadTemplates();
  }

  viewTemplate(template: RecurringInvoiceTemplate): void {
    this.router.navigate(['/recurring-invoices', template.id]);
    this.openDropdowns.clear();
  }

  editTemplate(template: RecurringInvoiceTemplate): void {
    this.router.navigate(['/recurring-invoices/edit', template.id]);
    this.openDropdowns.clear();
  }

  pauseTemplate(template: RecurringInvoiceTemplate): void {
    this.recurringService.pauseTemplate(template.id!).subscribe({
      next: () => {
        this.toast.success('Template paused successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error pausing template:', error);
        this.toast.error('Failed to pause template');
      },
    });
    this.openDropdowns.clear();
  }

  resumeTemplate(template: RecurringInvoiceTemplate): void {
    this.recurringService.resumeTemplate(template.id!).subscribe({
      next: () => {
        this.toast.success('Template resumed successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error resuming template:', error);
        this.toast.error('Failed to resume template');
      },
    });
    this.openDropdowns.clear();
  }

  cancelTemplate(template: RecurringInvoiceTemplate): void {
    if (
      !confirm(`Are you sure you want to cancel "${template.templateName}"?`)
    ) {
      return;
    }

    this.recurringService.cancelTemplate(template.id!).subscribe({
      next: () => {
        this.toast.success('Template cancelled successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error cancelling template:', error);
        this.toast.error('Failed to cancel template');
      },
    });
    this.openDropdowns.clear();
  }

  deleteTemplate(template: RecurringInvoiceTemplate): void {
    if (
      !confirm(
        `Are you sure you want to delete "${template.templateName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.recurringService.deleteTemplate(template.id!).subscribe({
      next: () => {
        this.toast.success('Template deleted successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        this.toast.error(error.error?.message || 'Failed to delete template');
      },
    });
    this.openDropdowns.clear();
  }

  createNewTemplate(): void {
    this.router.navigate(['/recurring-invoices/create']);
  }

  toggleDropdown(templateId: number): void {
    if (this.openDropdowns.has(templateId)) {
      this.openDropdowns.delete(templateId);
    } else {
      this.openDropdowns.clear();
      this.openDropdowns.add(templateId);
    }
  }

  isDropdownOpen(templateId: number): boolean {
    return this.openDropdowns.has(templateId);
  }

  toggleViewMode(mode: 'table' | 'card'): void {
    this.viewMode = mode;
    this.openDropdowns.clear();
  }
}
