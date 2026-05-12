import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { ProductService } from '../../../../../shared/Services/product.service';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

// Add these interfaces for the enhanced error handling
interface UploadError {
  row: number;
  product: any;
  errors: string[];
  severity: 'warning' | 'error';
}

interface UploadSummary {
  totalRows: number;
  successful: number;
  skipped: number;
  failed: number;
  warnings: number;
}

interface SkippedProduct {
  row: number;
  product: any;
  existingProductId: number;
  reason: string;
  existingProductData?: {
    id: number;
    name: string;
    productIdNumber: string;
  };
}

interface UploadResponse {
  success: boolean;
  summary: UploadSummary;
  results: {
    created: any[];
    skipped: SkippedProduct[];
    errors: UploadError[];
  };
  message: string;
}

@Component({
  selector: 'app-products-upload',
  templateUrl: './products-upload.component.html',
  styleUrls: ['./products-upload.component.scss'],
})
export class ProductsUploadComponent extends ModalComponent implements OnInit {
  isDragging = false;
  selectedFile: File | null = null;
  uploadProgress = 0;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  errorMessage = '';
  uploadResults: UploadResponse | null = null;

  // Enhanced error handling properties
  showDetailedErrors: boolean = false;
  showOnlyErrors: boolean = false;
  showOnlyWarnings: boolean = false;

  @Output() uploadComplete = new EventEmitter<any>();
  @Output() authError = new EventEmitter<void>();

  constructor(private productService: ProductService) {
    super();
  }

  // Check for a valid token and try to refresh if needed
  private getAuthToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      this.authError.emit();
      return null;
    }
    return token;
  }

  ngOnInit() {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File) {
    // Enhanced file validation
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/)
    ) {
      this.errorMessage =
        'Please upload a valid Excel (.xlsx, .xls) or CSV file';
      this.uploadStatus = 'error';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      this.errorMessage = 'File size exceeds the 5MB limit';
      this.uploadStatus = 'error';
      return;
    }

    this.selectedFile = file;
    this.errorMessage = '';
    this.uploadStatus = 'idle';
    this.uploadResults = null; // Reset previous results
  }

  async uploadFile() {
    if (!this.selectedFile) return;

    try {
      this.uploadStatus = 'uploading';
      this.uploadProgress = 0;
      this.uploadResults = null;

      const formData = new FormData();
      formData.append('file', this.selectedFile);

      // Get the auth token
      const token = this.getAuthToken();

      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 500);

      const response = await fetch(`${this.productService.apiUrl}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 401) {
          this.authError.emit();
          throw new Error(
            'Authentication expired. Please log in again to continue.'
          );
        }

        // Try to get detailed error from response
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Upload failed (${response.status})`
        );
      }

      this.uploadResults = (await response.json()) as UploadResponse;
      this.uploadStatus = 'success';
      this.uploadProgress = 100;

      // Show detailed results automatically if there are errors or warnings
      if (this.uploadResults.results.errors.length > 0) {
        this.showDetailedErrors = true;
      }

      this.uploadComplete.emit(this.uploadResults);
    } catch (error: any) {
      this.uploadStatus = 'error';
      this.errorMessage = error.message || 'Upload failed';
    }
  }

  // Enhanced template download with all fields
  downloadTemplate() {
    const templateData = [
      {
        name: 'Sample Laptop',
        description: 'High-performance laptop for business',
        price: 75000,
        buyingPrice: 60000,
        quantity: 25,
        storeQuantity: 5,
        reorderLevel: 3,
        categoryName: 'Electronics',
        productIdNumber: 'LAPTOP001',
        pictureUrl: 'https://example.com/laptop.jpg',
        countable: true,
        isService: false,
        availability: true,
        expiryDate: '',
      },
      {
        name: 'IT Consultation Service',
        description: 'Professional IT consultation and setup',
        price: 15000,
        buyingPrice: 0,
        quantity: 1,
        storeQuantity: 0,
        reorderLevel: 0,
        categoryName: 'Services',
        productIdNumber: 'SERVICE001',
        pictureUrl: '',
        countable: false,
        isService: true,
        availability: true,
        expiryDate: '',
      },
      {
        name: 'Energy Drink',
        description: 'Refreshing energy drink 250ml',
        price: 150,
        buyingPrice: 100,
        quantity: 200,
        storeQuantity: 50,
        reorderLevel: 20,
        categoryName: 'Beverages',
        productIdNumber: 'DRINK001',
        pictureUrl: '',
        countable: true,
        isService: false,
        availability: true,
        expiryDate: '2025-12-31',
      },
    ];

    // Convert to CSV
    const csvContent = this.convertToCSV(templateData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => {
          // Handle values that contain commas by wrapping in quotes
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }

  // Helper method to download actual template from server if available
  downloadServerTemplate() {
    const token = this.getAuthToken();
    if (!token) return;

    fetch(`${this.productService.apiUrl}/templates/product`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not download template');
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product-upload-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading template:', error);
        // Fall back to local template
        this.downloadTemplate();
      });
  }

  // Enhanced error handling methods
  getFilteredErrors(): UploadError[] {
    if (!this.uploadResults?.results.errors) return [];

    let filtered = this.uploadResults.results.errors;

    if (this.showOnlyErrors) {
      filtered = filtered.filter((error) => error.severity === 'error');
    }

    if (this.showOnlyWarnings) {
      filtered = filtered.filter((error) => error.severity === 'warning');
    }

    return filtered;
  }

  resetFilters(): void {
    this.showOnlyErrors = false;
    this.showOnlyWarnings = false;
  }

  getSeverityClass(severity: 'error' | 'warning'): string {
    return severity === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  }

  getSeverityIcon(severity: 'error' | 'warning'): string {
    return severity === 'error'
      ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
      : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Reset upload state
  resetUpload(): void {
    this.selectedFile = null;
    this.uploadStatus = 'idle';
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.uploadResults = null;
    this.showDetailedErrors = false;
    this.resetFilters();
  }

  // Override the close method from ModalComponent
  closeModal() {
    super.close();
    this.resetUpload();
  }

  errorOnly() {
    this.uploadResults!.results.errors.filter((e) => e.severity === 'error')
      .length;
  }
  warningOnly() {
    this.uploadResults!.results.errors.filter((e) => e.severity === 'warning')
      .length;
  }
}
