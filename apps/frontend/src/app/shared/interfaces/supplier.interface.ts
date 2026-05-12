export interface Supplier {
  id: number | string;
  name: string;
  phone: string;
  totalUnpaidSuppliers: number;
  deleted: boolean;
  created_at: any;
}
