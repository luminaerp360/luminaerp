import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { InvoiceService } from '../../../../../shared/Services/invoice.service';
import {
  Invoice,
  InvoiceStatus,
} from '../../../../../shared/interfaces/invoice.interface';

@Component({
  selector: 'app-public-invoice',
  templateUrl: './public-invoice.component.html',
  styleUrl: './public-invoice.component.scss',
})
export class PublicInvoiceComponent implements OnInit {
  invoice: Invoice | null = null;
  isLoading = true;
  InvoiceStatus = InvoiceStatus;
  Math = Math;
  error = false;
  publicToken: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public invoiceService: InvoiceService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.publicToken = token;
      this.loadPublicInvoice(token);
    } else {
      this.toast.error('Invalid invoice link');
      this.error = true;
      this.isLoading = false;
    }
  }

  loadPublicInvoice(token: string): void {
    this.isLoading = true;
    this.invoiceService.getPublicInvoice(token).subscribe({
      next: (invoice) => {
        this.invoice = invoice;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoice:', error);
        this.toast.error('Invoice not found or link has expired');
        this.error = true;
        this.isLoading = false;
      },
    });
  }

  printInvoice(): void {
    // Open PDF in new tab for printing
    const pdfUrl = this.invoiceService.getPublicInvoiceViewUrl(this.publicToken);
    window.open(pdfUrl, '_blank');
  }

  downloadPDF(): void {
    this.toast.loading('Generating PDF...');
    this.invoiceService
      .downloadPublicInvoicePDF(this.publicToken, 'professional')
      .subscribe({
        next: (blob) => {
          const filename = `Invoice-${this.invoice?.invoiceNumber || 'download'}.pdf`;
          this.invoiceService.downloadBlob(blob, filename);
          this.toast.success('PDF downloaded successfully');
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.toast.error('Failed to download PDF');
        },
      });
  }

  viewPDFInBrowser(): void {
    const pdfUrl = this.invoiceService.getPublicInvoiceViewUrl(this.publicToken);
    window.open(pdfUrl, '_blank');
  }
}
