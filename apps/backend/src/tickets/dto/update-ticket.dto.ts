import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketDto {
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsNumber()
  @IsOptional()
  assignedToId?: number;
}
