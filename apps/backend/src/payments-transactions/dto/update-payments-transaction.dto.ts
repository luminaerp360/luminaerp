import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payments-transaction.dto';

export class UpdatePaymentsTransactionDto extends PartialType(CreatePaymentDto) {}
