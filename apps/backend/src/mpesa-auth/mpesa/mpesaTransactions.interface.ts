export interface MpesaTransactionData {
  merchantRequestID: string;
  checkoutRequestID: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
}
