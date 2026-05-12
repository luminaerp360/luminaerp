export interface CreditSale {
  id?: number;
  customer_id: number;
  items: any[]; // Consider defining a more specific type for items

  order_id?: number;
  credit_amount: number;
  order_date: Date;
  payment_date: Date;
  amount_paid?: number;
  fully_paid?: number;
  customer_name: string;
  created_by: string;
  shift_id?: number;
  phone_number?: string;
  order_remarks?: string;
  national_id?: string;
  confirm_delete?: boolean;
  payment_terms?: string;
  cash_paid?: number;
  mpesa_paid?: number;
  bank_paid?: number;
  mpesa_confirmation_code?: string;
  bank_confirmation_code?: string;
  balance?: number;
  complementary_of?: string;
  complimentary_amount?: number;
  voucher_code?: string;
  voucher_amount?: number;
  createdAt?: any;
  vat_amount?: number;
  totalTax?: number;
  discount_amount?: number;
  totalDiscount?: number;
  isPaid?: boolean; // Computed property for display purposes
}
