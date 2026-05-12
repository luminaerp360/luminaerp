import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
  TicketCategory,
} from '../entities/ticket.entity';
import { Type } from 'class-transformer';

export class FilterTicketsDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
