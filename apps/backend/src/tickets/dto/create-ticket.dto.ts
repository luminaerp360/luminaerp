import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { TicketPriority, TicketCategory } from '../entities/ticket.entity';

export class CreateTicketDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;
}
