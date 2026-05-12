export interface Quotation {
  sendingEmail: any;
  downloadingPDF: any;
  converting?: boolean;
  approvingStatus?: boolean;
  notes?: string;
  createdAt: string | number | Date;
  id: number;
  referenceNumber: string;
  customerId: number;
  supplierId?: number; // deprecated, use customerId
  items: any;
  totalAmount: number;
  totalTax: number;
  totalDiscount?: number;
  status: string;
}
