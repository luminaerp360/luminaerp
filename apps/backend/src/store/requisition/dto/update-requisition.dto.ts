import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequisitionPriorityDto } from './create-requisition.dto';

export class UpdateRequisitionItemDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsInt()
  @IsPositive()
  storeProductId: number;

  @IsInt()
  @IsPositive()
  quantityRequested: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRequisitionDto {
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @IsEnum(RequisitionPriorityDto)
  @IsOptional()
  priority?: RequisitionPriorityDto;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => UpdateRequisitionItemDto)
  @IsOptional()
  items?: UpdateRequisitionItemDto[];
}

export class ApproveRequisitionDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApproveRequisitionItemDto)
  items?: ApproveRequisitionItemDto[];
}

export class ApproveRequisitionItemDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  @IsPositive()
  quantityApproved: number;
}

export class IssueRequisitionDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IssueRequisitionItemDto)
  items?: IssueRequisitionItemDto[];
}

export class IssueRequisitionItemDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  @IsPositive()
  quantityIssued: number;
}

export class RejectDto {
  @IsString()
  reason: string;
}
