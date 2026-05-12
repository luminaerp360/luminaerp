import { TransactionType, PaymentMethod } from '@prisma/client';

export class CreatePaymentTransactionDto {
  transactionType: TransactionType;
  amount: number;
  method: PaymentMethod;
  transactionCode?: string;
  remarks?: string;
  paidBy: string;
  paidTo?: string;
  description: string;
  receiptUrl?: string;
}