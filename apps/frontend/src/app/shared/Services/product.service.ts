import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../interfaces/categories';
import { Product } from '../interfaces/products';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';

// Add these interfaces for the analytics responses
export interface ProductValueSummary {
  productCount: number;
  totalQuantity: number;
  totalBuyingValue: number;
  totalSellingValue: number;
  totalPotentialProfit: number;
  overallProfitMargin: number;
}

export interface ProductValueDetail {
  id: number;
  name: string;
  category: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  buyingValue: number;
  sellingValue: number;
  potentialProfit: number;
  profitMargin: number;
}

export interface ProductValueResponse {
  summary: ProductValueSummary;
  products: ProductValueDetail[];
}

export interface CategoryValueResponse {
  categoryName: string;
  productCount: number;
  totalQuantity: number;
  totalBuyingValue: number;
  totalSellingValue: number;
  totalPotentialProfit: number;
  profitMargin: number;
}

export interface LowStockProduct {
  id: number;
  name: string;
  category: string;
  currentQuantity: number;
  reorderLevel: number;
  buyingPrice: number;
  sellingPrice: number;
  stockValue: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK';
}

export interface LowStockSummary {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockValue: number;
}

export interface LowStockResponse {
  summary: LowStockSummary;
  lowStockProducts: LowStockProduct[];
  outOfStockProducts: LowStockProduct[];
}

export interface ProductUnit {
  id: number;
  productId: number;
  identifierType: 'SERIAL' | 'IMEI' | 'REGISTRATION';
  identifierValue: string;
  status: 'IN_STOCK' | 'RESERVED' | 'SOLD';
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  soldAt?: string;
  orderId?: number;
  order?: { id: number; receiptNumber: string; createdAt: string };
}

export interface PaginatedUnitsResponse {
  data: ProductUnit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnitTimelineEvent {
  event: 'CREATED' | 'SOLD';
  date: string;
  details: Record<string, any>;
}

export interface UnitHistoryResponse {
  unit: ProductUnit;
  timeline: UnitTimelineEvent[];
}

export interface ProductAsset {
  id: number;
  productId?: number;
  productUnitId?: number;
  assetType:
    | 'IMAGE'
    | 'DOCUMENT'
    | 'LOGBOOK'
    | 'INSURANCE'
    | 'WARRANTY'
    | 'OTHER';
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}products`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Special headers for file upload that don't include Content-Type
  private getFileUploadHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getAllProducts(): Observable<Product[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<Product[]>(url, { headers: this.getHeaders() });
  }

  addProduct(product: Product): Observable<Product> {
    const url = `${this.apiUrl}`;
    return this.http.post<Product>(url, product, {
      headers: this.getHeaders(),
    });
  }

  getProductbyId(id: number): Observable<Product> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Product>(url, { headers: this.getHeaders() });
  }

  searchProductByBarcode(barcode: string): Observable<Product> {
    const url = `${this.apiUrl}/search/barcode?barcode=${barcode}`;
    return this.http.get<Product>(url, { headers: this.getHeaders() });
  }

  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  updateProductQuantity(id: number, quantity: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/quantity`,
      { quantity },
      { headers: this.getHeaders() },
    );
  }

  bulkUpdateStock(
    products: { productId: number; quantity: number }[],
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/bulk-update-stock`,
      { products },
      { headers: this.getHeaders() },
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  uploadCSV(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Using special headers for file upload that don't include Content-Type
    return this.http.post(`${this.apiUrl}/upload`, formData, {
      headers: this.getFileUploadHeaders(),
    });
  }

  getProductUnits(
    productId: number,
    options?: {
      status?: 'IN_STOCK' | 'RESERVED' | 'SOLD';
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): Observable<PaginatedUnitsResponse> {
    let params: string[] = [];
    if (options?.status) params.push(`status=${options.status}`);
    if (options?.page) params.push(`page=${options.page}`);
    if (options?.limit) params.push(`limit=${options.limit}`);
    if (options?.startDate) params.push(`startDate=${options.startDate}`);
    if (options?.endDate) params.push(`endDate=${options.endDate}`);
    if (options?.search)
      params.push(`search=${encodeURIComponent(options.search)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get<PaginatedUnitsResponse>(
      `${this.apiUrl}/${productId}/units${query}`,
      {
        headers: this.getHeaders(),
      },
    );
  }

  getUnitHistory(
    productId: number,
    unitId: number,
  ): Observable<UnitHistoryResponse> {
    return this.http.get<UnitHistoryResponse>(
      `${this.apiUrl}/${productId}/units/${unitId}/history`,
      { headers: this.getHeaders() },
    );
  }

  bulkCreateProductUnits(
    productId: number,
    identifiers: string[],
    metadata?: Record<string, any>,
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${productId}/units/bulk`,
      { identifiers, metadata },
      { headers: this.getHeaders() },
    );
  }

  createProductAsset(
    productId: number,
    payload: {
      fileUrl: string;
      fileName?: string;
      mimeType?: string;
      assetType?:
        | 'IMAGE'
        | 'DOCUMENT'
        | 'LOGBOOK'
        | 'INSURANCE'
        | 'WARRANTY'
        | 'OTHER';
      productUnitId?: number;
    },
  ): Observable<ProductAsset> {
    return this.http.post<ProductAsset>(
      `${this.apiUrl}/${productId}/assets`,
      payload,
      {
        headers: this.getHeaders(),
      },
    );
  }

  uploadProductAsset(
    productId: number,
    file: File,
    assetType?:
      | 'IMAGE'
      | 'DOCUMENT'
      | 'LOGBOOK'
      | 'INSURANCE'
      | 'WARRANTY'
      | 'OTHER',
    productUnitId?: number,
  ): Observable<ProductAsset> {
    const formData = new FormData();
    formData.append('file', file);
    if (assetType) {
      formData.append('assetType', assetType);
    }
    if (productUnitId) {
      formData.append('productUnitId', String(productUnitId));
    }

    return this.http.post<ProductAsset>(
      `${this.apiUrl}/${productId}/assets/upload`,
      formData,
      { headers: this.getFileUploadHeaders() },
    );
  }

  // NEW ANALYTICS METHODS
  getProductsValue(): Observable<ProductValueResponse> {
    const url = `${this.apiUrl}/analytics/value`;
    return this.http.get<ProductValueResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  getProductsValueByCategory(): Observable<CategoryValueResponse[]> {
    const url = `${this.apiUrl}/analytics/value-by-category`;
    return this.http.get<CategoryValueResponse[]>(url, {
      headers: this.getHeaders(),
    });
  }

  getLowStockProducts(): Observable<LowStockResponse> {
    const url = `${this.apiUrl}/analytics/low-stock`;
    return this.http.get<LowStockResponse>(url, { headers: this.getHeaders() });
  }
}
