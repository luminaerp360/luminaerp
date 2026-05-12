import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { RecurringInvoiceService } from '../../../../../../shared/Services/recurring-invoice.service';
import {
  RecurringInvoiceTemplate,
  RecurringStatus,
} from '../../../../../../shared/interfaces/recurring-invoice.interface';

@Component({
  selector: 'app-view-recurring-invoice',
  templateUrl: './view-recurring-invoice.component.html',
  styleUrls: ['./view-recurring-invoice.component.scss'],
})
export class ViewRecurringInvoiceComponent implements OnInit {
  templateId!: number;
  template?: RecurringInvoiceTemplate;
  isLoading = false;
  RecurringStatus = RecurringStatus;

  constructor(
    public recurringService: RecurringInvoiceService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.templateId = parseInt(id, 10);
      this.loadTemplate();
    } else {
      this.toast.error('Invalid template ID');
      this.router.navigate(['/recurring-invoices']);
    }
  }

  /**
   * Load template details
   */
  loadTemplate(): void {
    this.isLoading = true;
    this.recurringService.getTemplateById(this.templateId).subscribe({
      next: (template: any) => {
        this.template = template;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load template:', error);
        this.toast.error('Failed to load template');
        this.isLoading = false;
        this.router.navigate(['/recurring-invoices']);
      },
    });
  }

  /**
   * Calculate line total
   */
  calculateLineTotal(item: any): number {
    const subtotal = item.quantity * item.unitPrice;
    const afterDiscount = subtotal - (item.discountAmount || 0);
    const taxAmount = afterDiscount * ((item.taxRate || 0) / 100);
    return afterDiscount + taxAmount;
  }

  /**
   * Edit template
   */
  editTemplate(): void {
    this.router.navigate(['/recurring-invoices/edit', this.templateId]);
  }

  /**
   * Pause template
   */
  pauseTemplate(): void {
    if (!confirm('Are you sure you want to pause this template?')) return;

    this.recurringService.pauseTemplate(this.templateId).subscribe({
      next: () => {
        this.toast.success('Template paused successfully');
        this.loadTemplate();
      },
      error: (error: any) => {
        console.error('Failed to pause template:', error);
        this.toast.error('Failed to pause template');
      },
    });
  }

  /**
   * Resume template
   */
  resumeTemplate(): void {
    this.recurringService.resumeTemplate(this.templateId).subscribe({
      next: () => {
        this.toast.success('Template resumed successfully');
        this.loadTemplate();
      },
      error: (error: any) => {
        console.error('Failed to resume template:', error);
        this.toast.error('Failed to resume template');
      },
    });
  }

  /**
   * Cancel template
   */
  cancelTemplate(): void {
    if (
      !confirm(
        'Are you sure you want to cancel this template? This action cannot be undone.',
      )
    )
      return;

    this.recurringService.cancelTemplate(this.templateId).subscribe({
      next: () => {
        this.toast.success('Template cancelled successfully');
        this.loadTemplate();
      },
      error: (error: any) => {
        console.error('Failed to cancel template:', error);
        this.toast.error('Failed to cancel template');
      },
    });
  }

  /**
   * Go back
   */
  goBack(): void {
    this.router.navigate(['/recurring-invoices']);
  }

  /**
   * Print template
   */
  printTemplate(): void {
    window.print();
  }
}
