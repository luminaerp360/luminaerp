import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../Environments/environments';
import { LocalStorageService } from '../../../shared/Services/local-storage.service';
import {
  CreateStockTransferDto,
  StockTransferResponse,
  StockTransferStatus,
  StockTransferListResponse,
  UpdateStockTransferStatusDto,
  StockTransferStatsResponse,
  BulkApprovalRequest,
  BulkOperationResponse,
  BulkRejectionRequest,
  Organization,
  StockTransfer,
  StockTransferQuery,
  PagedStockTransferResponse,
} from '../interfaces/stock-tranfer.interface';

@Injectable({
  providedIn: 'root',
})
export class StockTransferService {
  apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiMainRootUrl}stock-transfers`;
  }

  /**
   * New paginated/filtered stock transfers endpoint
   * Supports: page, pageSize, startDate, endDate, search, status (multi), organizationId
   */
  getStockTransfers(
    query: StockTransferQuery = {}
  ): Observable<PagedStockTransferResponse> {
    let params = new HttpParams();
    const withDefaults: Required<
      Pick<StockTransferQuery, 'page' | 'pageSize'>
    > &
      StockTransferQuery = {
      page: 1,
      pageSize: 20,
      ...query,
    };

    Object.entries(withDefaults).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'status' && Array.isArray(value) && value.length) {
        params = params.set('status', value.join(','));
      } else if (key === 'organizationId' && typeof value === 'number') {
        params = params.set('organizationId', String(value));
      } else if (key === 'page' || key === 'pageSize') {
        params = params.set(key, String(value));
      } else if (!Array.isArray(value)) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PagedStockTransferResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Create a new stock transfer
  createStockTransfer(
    transferData: CreateStockTransferDto
  ): Observable<StockTransferResponse> {
    return this.http.post<StockTransferResponse>(this.apiUrl, transferData, {
      headers: this.getHeaders(),
    });
  }

  // Get all stock transfers with optional filters
  getAllStockTransfers(options?: {
    organizationId?: number;
    status?: StockTransferStatus;
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }): Observable<StockTransferListResponse> {
    let params = new HttpParams();

    if (options?.organizationId) {
      params = params.set('organizationId', options.organizationId.toString());
    }
    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.page) {
      params = params.set('page', options.page.toString());
    }
    if (options?.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options?.fromDate) {
      params = params.set('fromDate', options.fromDate);
    }
    if (options?.toDate) {
      params = params.set('toDate', options.toDate);
    }

    return this.http.get<StockTransferListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Get stock transfers for current organization
  getMyStockTransfers(
    status?: StockTransferStatus
  ): Observable<StockTransferListResponse> {
    const organizationId = this.savedOrg ? parseInt(this.savedOrg) : undefined;
    return this.getAllStockTransfers({ organizationId, status });
  }

  // Get pending transfers that need approval
  getPendingTransfers(): Observable<StockTransferListResponse> {
    return this.getAllStockTransfers({ status: StockTransferStatus.PENDING });
  }

  // Get a specific stock transfer by ID
  getStockTransferById(id: number): Observable<StockTransferResponse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<StockTransferResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  // Update stock transfer status (approve, reject, complete, cancel)
  updateStockTransferStatus(
    id: number,
    statusUpdate: UpdateStockTransferStatusDto
  ): Observable<StockTransferResponse> {
    const url = `${this.apiUrl}/${id}/status`;
    return this.http.patch<StockTransferResponse>(url, statusUpdate, {
      headers: this.getHeaders(),
    });
  }

  // Approve a stock transfer
  approveStockTransfer(
    id: number,
    notes?: string
  ): Observable<StockTransferResponse> {
    return this.updateStockTransferStatus(id, {
      status: StockTransferStatus.APPROVED,
      notes,
    });
  }

  // Reject a stock transfer
  rejectStockTransfer(
    id: number,
    rejectionReason: string,
    notes?: string
  ): Observable<StockTransferResponse> {
    return this.updateStockTransferStatus(id, {
      status: StockTransferStatus.REJECTED,
      rejectionReason,
      notes,
    });
  }

  // Complete a stock transfer
  completeStockTransfer(
    id: number,
    notes?: string
  ): Observable<StockTransferResponse> {
    return this.updateStockTransferStatus(id, {
      status: StockTransferStatus.COMPLETED,
      notes,
    });
  }

  // Cancel a stock transfer
  cancelStockTransfer(id: number): Observable<StockTransferResponse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<StockTransferResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  // Get stock transfer statistics for an organization
  getStockTransferStats(
    organizationId: number
  ): Observable<StockTransferStatsResponse> {
    const url = `${this.apiUrl}/organization/${organizationId}/stats`;
    return this.http.get<StockTransferStatsResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  // Get current organization's transfer stats
  getMyTransferStats(): Observable<StockTransferStatsResponse> {
    const organizationId = this.savedOrg ? parseInt(this.savedOrg) : 0;
    return this.getStockTransferStats(organizationId);
  }

  // Bulk approve multiple transfers
  bulkApproveTransfers(
    request: BulkApprovalRequest
  ): Observable<BulkOperationResponse> {
    const url = `${this.apiUrl}/bulk/approve`;
    return this.http.post<BulkOperationResponse>(url, request, {
      headers: this.getHeaders(),
    });
  }

  // Bulk reject multiple transfers
  bulkRejectTransfers(
    request: BulkRejectionRequest
  ): Observable<BulkOperationResponse> {
    const url = `${this.apiUrl}/bulk/reject`;
    return this.http.post<BulkOperationResponse>(url, request, {
      headers: this.getHeaders(),
    });
  }

  // Get transfers by status
  getTransfersByStatus(
    status: StockTransferStatus
  ): Observable<StockTransferListResponse> {
    return this.getAllStockTransfers({ status });
  }

  // Get incoming transfers (transfers TO current organization)
  getIncomingTransfers(
    status?: StockTransferStatus
  ): Observable<StockTransferListResponse> {
    const organizationId = this.savedOrg ? parseInt(this.savedOrg) : undefined;
    let params = new HttpParams();

    if (organizationId) {
      params = params.set('toOrganizationId', organizationId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<StockTransferListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Get outgoing transfers (transfers FROM current organization)
  getOutgoingTransfers(
    status?: StockTransferStatus
  ): Observable<StockTransferListResponse> {
    const organizationId = this.savedOrg ? parseInt(this.savedOrg) : undefined;
    let params = new HttpParams();

    if (organizationId) {
      params = params.set('fromOrganizationId', organizationId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<StockTransferListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Search transfers by transfer number
  searchByTransferNumber(
    transferNumber: string
  ): Observable<StockTransferListResponse> {
    let params = new HttpParams().set('transferNumber', transferNumber);

    return this.http.get<StockTransferListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Search transfers by product
  searchByProduct(
    productIdNumber: string
  ): Observable<StockTransferListResponse> {
    let params = new HttpParams().set('productIdNumber', productIdNumber);

    return this.http.get<StockTransferListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  // Get transfer history for a specific product
  getProductTransferHistory(
    productIdNumber: string
  ): Observable<StockTransferListResponse> {
    const url = `${this.apiUrl}/product/${productIdNumber}/history`;
    return this.http.get<StockTransferListResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  // Get organizations that user can transfer to/from
  getAvailableOrganizations(): Observable<Organization[]> {
    // Use apiMainRootUrl because `apiRootUrl` already includes `/organizations/{orgId}/`
    const url = `${environment.apiMainRootUrl}organizations`;
    return this.http.get<Organization[]>(url, {
      headers: this.getHeaders(),
    });
  }

  // Utility method to parse items from JSON string
  parseTransferItems(transfer: StockTransfer): StockTransfer {
    if (typeof transfer.items === 'string') {
      try {
        transfer.items = JSON.parse(transfer.items);
      } catch (error) {
        console.error('Error parsing transfer items:', error);
        transfer.items = [];
      }
    }
    return transfer;
  }

  // Utility method to format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  // Utility method to get status badge class
  getStatusBadgeClass(status: StockTransferStatus): string {
    switch (status) {
      case StockTransferStatus.PENDING:
        return 'badge-warning';
      case StockTransferStatus.APPROVED:
        return 'badge-info';
      case StockTransferStatus.COMPLETED:
        return 'badge-success';
      case StockTransferStatus.REJECTED:
        return 'badge-danger';
      case StockTransferStatus.CANCELLED:
        return 'badge-secondary';
      default:
        return 'badge-light';
    }
  }

  // Utility method to check if user can approve transfer
  canApproveTransfer(transfer: StockTransfer): boolean {
    const currentOrgId = this.savedOrg ? parseInt(this.savedOrg) : 0;
    return (
      transfer.status === StockTransferStatus.PENDING &&
      transfer.toOrganizationId === currentOrgId
    );
  }

  // Utility method to check if user can cancel transfer
  canCancelTransfer(transfer: StockTransfer): boolean {
    const currentOrgId = this.savedOrg ? parseInt(this.savedOrg) : 0;
    return (
      transfer.status === StockTransferStatus.PENDING &&
      transfer.fromOrganizationId === currentOrgId
    );
  }
}
