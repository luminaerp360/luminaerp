// pdf.dto.ts
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class BulkDownloadCreditSalesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  creditSaleIds: number[];

  @IsOptional()
  @IsString()
  @IsIn(['invoice', 'receipt'])
  format?: 'invoice' | 'receipt';
}

export class CustomerStatementPDFDto {
  @IsOptional()
  @IsBoolean()
  includePaymentHistory?: boolean;
}

export class UnpaidReportPDFDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

// Response interfaces for PDF operations
export interface PDFDownloadResponse {
  filename: string;
  data: string; // base64 encoded PDF
  mimeType: 'application/pdf';
}

export interface BulkPDFDownloadResponse {
  filename: string;
  data: Buffer; // ZIP file buffer
  mimeType: 'application/zip';
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
}
