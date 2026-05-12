import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditorsService } from '../../../shared/Services/creditors.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-supplier-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-statement.component.html',
  styleUrls: ['./supplier-statement.component.scss'],
})
export class SupplierStatementComponent implements OnInit {
  supplierId: number | null = null;
  statement: any = null;
  loading = false;

  // Filters
  startDate = '';
  endDate = '';

  constructor(
    private creditorsService: CreditorsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('supplierId');
      if (id) {
        this.supplierId = +id;
        this.setDefaultDates();
        this.loadStatement();
      }
    });
  }

  setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  loadStatement() {
    if (!this.supplierId) return;

    this.loading = true;
    this.creditorsService
      .getSupplierStatement(this.supplierId, this.startDate, this.endDate)
      .subscribe({
        next: (data) => {
          this.statement = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading statement:', error);
          this.toast.error('Failed to load supplier statement');
          this.loading = false;
        },
      });
  }

  applyFilters() {
    this.loadStatement();
  }

  goBack() {
    this.router.navigate(['/creditors/suppliers']);
  }

  printStatement() {
    window.print();
  }
}
