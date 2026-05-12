import { Component, OnInit } from '@angular/core';
import { StockSheetService } from '../../../../shared/Services/stock-sheet.service';
import {
  StockSheetSummary,
  StockSheetProductItem,
  CurrentStockValue,
} from '../../../../shared/interfaces/stock-sheet.interface';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-stock-sheet',
  templateUrl: './stock-sheet.component.html',
  styleUrls: ['./stock-sheet.component.scss'],
})
export class StockSheetComponent implements OnInit {
  selectedDate: string = new Date().toISOString().split('T')[0];
  stockSheet: StockSheetSummary | null = null;
  currentStockValue: CurrentStockValue | null = null;
  loading: boolean = false;
  activeTab: 'daily' | 'current' = 'daily';

  constructor(
    private stockSheetService: StockSheetService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadStockSheet();
    this.loadCurrentStockValue();
  }

  loadStockSheet(): void {
    this.loading = true;
    this.stockSheetService.getStockSheet(this.selectedDate).subscribe({
      next: (data) => {
        this.stockSheet = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stock sheet:', error);
        this.toast.error('Failed to load stock sheet');
        this.loading = false;
      },
    });
  }

  loadCurrentStockValue(): void {
    this.stockSheetService.getCurrentStockValue().subscribe({
      next: (data) => {
        this.currentStockValue = data;
      },
      error: (error) => {
        console.error('Error loading current stock value:', error);
        this.toast.error('Failed to load current stock value');
      },
    });
  }

  onDateChange(): void {
    this.loadStockSheet();
  }

  switchTab(tab: 'daily' | 'current'): void {
    this.activeTab = tab;
  }

  exportToExcel(): void {
    if (!this.stockSheet) {
      this.toast.error('No data to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Product Code',
      'Product Name',
      'Category',
      'Opening Stock',
      'Purchases',
      'Sales',
      'Closing Stock',
      'Buying Price',
      'Selling Price',
      'Stock Value',
      'Sales Revenue',
      'COGS',
      'Gross Profit',
      'Profit Margin %',
    ];

    const rows = this.stockSheet.items.map((item) => [
      item.productCode,
      item.productName,
      item.category,
      item.openingStock,
      item.purchases,
      item.sales,
      item.closingStock,
      item.buyingPrice,
      item.sellingPrice,
      item.stockValue,
      item.salesRevenue,
      item.costOfGoodsSold,
      item.grossProfit,
      item.profitMargin,
    ]);

    // Add summary row
    rows.push([
      'TOTAL',
      '',
      '',
      this.stockSheet.totalOpeningStock,
      this.stockSheet.totalPurchases,
      this.stockSheet.totalSales,
      this.stockSheet.totalClosingStock,
      0,
      0,
      this.stockSheet.totalStockValue,
      this.stockSheet.totalSalesRevenue,
      this.stockSheet.totalCostOfGoodsSold,
      this.stockSheet.totalGrossProfit,
      this.stockSheet.averageProfitMargin,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-sheet-${this.selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Stock sheet exported successfully');
  }

  exportCurrentValueToExcel(): void {
    if (!this.currentStockValue) {
      this.toast.error('No data to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Product ID',
      'Product Name',
      'Quantity',
      'Buying Price',
      'Selling Price',
      'Stock Value',
      'Potential Revenue',
      'Potential Profit',
    ];

    const rows = this.currentStockValue.items.map((item) => [
      item.productId,
      item.productName,
      item.quantity,
      item.buyingPrice,
      item.sellingPrice,
      item.stockValue,
      item.potentialRevenue,
      item.potentialProfit,
    ]);

    // Add summary row
    rows.push([
      'TOTAL',
      '',
      this.currentStockValue.totalQuantity,
      0,
      0,
      this.currentStockValue.totalStockValue,
      this.currentStockValue.totalPotentialRevenue,
      this.currentStockValue.totalPotentialProfit,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `current-stock-value-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Stock value exported successfully');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-KE').format(value);
  }
}
