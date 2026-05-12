import { Component, OnInit } from '@angular/core';
import { InventoryMovementService } from '../../../../shared/Services/inventory-movement.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-stock-movements',
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
})
export class StockMovementsComponent implements OnInit {
  movements: any[] = [];
  filteredMovements: any[] = [];
  products: any[] = [];
  isLoading = true;

  // Filters
  selectedProductId: number | null = null;
  selectedMovementType: string = '';
  startDate: string = '';
  endDate: string = '';
  searchQuery: string = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  movementTypes = [
    { value: '', label: 'All Types' },
    { value: 'PURCHASE', label: '📦 Purchase', color: 'green' },
    { value: 'SALE', label: '🛒 Sale', color: 'blue' },
    { value: 'EXPIRED', label: '⏰ Expired', color: 'red' },
    { value: 'DAMAGE', label: '⚠️ Damaged', color: 'orange' },
    { value: 'THEFT', label: '🚫 Theft/Loss', color: 'red' },
    { value: 'SAMPLE', label: '🎁 Sample', color: 'purple' },
    {
      value: 'ADJUSTMENT_INCREASE',
      label: '📈 Stock Increase',
      color: 'green',
    },
    {
      value: 'ADJUSTMENT_DECREASE',
      label: '📉 Stock Decrease',
      color: 'orange',
    },
    { value: 'TRANSFER_IN', label: '⬅️ Transfer In', color: 'blue' },
    { value: 'TRANSFER_OUT', label: '➡️ Transfer Out', color: 'blue' },
  ];

  constructor(
    private movementService: InventoryMovementService,
    private productService: ProductService,
    private toast: HotToastService,
  ) {
    // Set default start date to 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products.filter((p: any) => !p.isService);
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
    });
  }

  loadMovements(): void {
    this.isLoading = true;

    this.movementService
      .getAllMovements(
        this.selectedProductId || undefined,
        this.selectedMovementType
          ? (this.selectedMovementType as any)
          : undefined,
        this.startDate || undefined,
        this.endDate || undefined,
      )
      .subscribe({
        next: (movements) => {
          this.movements = movements;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading movements:', error);
          this.toast.error('Failed to load stock movements');
          this.isLoading = false;
        },
      });
  }

  applyFilters(): void {
    let filtered = [...this.movements];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.product?.name?.toLowerCase().includes(query) ||
          m.performedByName?.toLowerCase().includes(query) ||
          m.reason?.toLowerCase().includes(query) ||
          m.notes?.toLowerCase().includes(query),
      );
    }

    this.filteredMovements = filtered;
    this.totalPages = Math.ceil(
      this.filteredMovements.length / this.itemsPerPage,
    );
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.loadMovements();
  }

  clearFilters(): void {
    this.selectedProductId = null;
    this.selectedMovementType = '';
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
    this.endDate = '';
    this.searchQuery = '';
    this.loadMovements();
  }

  refreshMovements(): void {
    this.toast.info('Refreshing movements...');
    this.loadMovements();
  }

  get paginatedMovements(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredMovements.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getMovementTypeInfo(type: string): any {
    return (
      this.movementTypes.find((t) => t.value === type) || {
        label: type,
        color: 'gray',
      }
    );
  }

  getMovementClass(movement: any): string {
    if (movement.quantityChange > 0) {
      return 'text-green-600 dark:text-green-400';
    } else if (movement.quantityChange < 0) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportToCSV(): void {
    const headers = [
      'Date',
      'Product',
      'Type',
      'Quantity Change',
      'Before',
      'After',
      'Unit Cost',
      'Total Value',
      'Reason',
      'Performed By',
    ];

    const rows = this.filteredMovements.map((m) => [
      this.formatDate(m.timestamp),
      m.product?.name || 'N/A',
      m.movementType,
      m.quantityChange,
      m.quantityBefore,
      m.quantityAfter,
      m.unitCost || 0,
      m.totalValue || 0,
      m.reason || '',
      m.performedByName || '',
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `stock-movements-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Stock movements exported successfully');
  }
}
