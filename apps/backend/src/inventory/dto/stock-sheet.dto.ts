import { IsDateString, IsOptional, IsNumber } from 'class-validator';

export class StockSheetQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
}

export interface StockSheetProductItem {
  productId: number;
  productName: string;
  productCode: string;
  category: string;
  openingStock: number;
  purchases: number;
  sales: number;
  closingStock: number;
  buyingPrice: number;
  sellingPrice: number;
  stockValue: number;
  salesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  profitMargin: number;
}

export interface StockSheetSummary {
  date: string;
  totalProducts: number;
  totalOpeningStock: number;
  totalPurchases: number;
  totalSales: number;
  totalClosingStock: number;
  totalStockValue: number;
  totalSalesRevenue: number;
  totalCostOfGoodsSold: number;
  totalGrossProfit: number;
  averageProfitMargin: number;
  items: StockSheetProductItem[];
}
