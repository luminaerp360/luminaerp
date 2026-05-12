import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditorsService } from '../../../shared/Services/creditors.service';
import { AgingAnalysis } from '../../../types/creditors.types';

@Component({
  selector: 'app-creditors-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditors-dashboard.component.html',
  styleUrls: ['./creditors-dashboard.component.scss'],
})
export class CreditorsDashboardComponent implements OnInit {
  agingData: AgingAnalysis | null = null;
  loading = false;

  constructor(
    private creditorsService: CreditorsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadAgingAnalysis();
  }

  loadAgingAnalysis() {
    this.loading = true;
    this.creditorsService.getAgingAnalysis().subscribe({
      next: (data) => {
        this.agingData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading aging analysis:', error);
        this.loading = false;
      },
    });
  }

  navigateToSuppliers() {
    this.router.navigate(['/creditors/suppliers']);
  }

  navigateToPaymentHistory() {
    this.router.navigate(['/creditors/payment-history']);
  }

  viewBillsInBucket(bucket: string) {
    // Navigate to suppliers page with filter
    this.router.navigate(['/creditors/suppliers'], {
      queryParams: { bucket },
    });
  }
}
