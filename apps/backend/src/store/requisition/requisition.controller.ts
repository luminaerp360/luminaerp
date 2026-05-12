import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import {
  UpdateRequisitionDto,
  ApproveRequisitionDto,
  IssueRequisitionDto,
} from './dto/update-requisition.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';
import { RequisitionStatus } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @GetUser('id') userId: number,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.requisitionService.create(dto, organizationId, userId);
  }

  @Get()
  findAll(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('status') status?: RequisitionStatus,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('requestedBy') requestedBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.requisitionService.findAll(organizationId, {
      status,
      departmentId: departmentId ? +departmentId : undefined,
      priority,
      requestedBy: requestedBy ? +requestedBy : undefined,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.requisitionService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequisitionDto,
  ) {
    return this.requisitionService.update(id, dto, organizationId);
  }

  @Patch(':id/approve')
  approve(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() dto: ApproveRequisitionDto,
  ) {
    return this.requisitionService.approve(id, organizationId, userId, dto);
  }

  @Patch(':id/reject')
  reject(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body('reason') reason: string,
  ) {
    return this.requisitionService.reject(
      id,
      organizationId,
      userId,
      reason || 'No reason provided',
    );
  }

  @Patch(':id/issue')
  issue(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() dto: IssueRequisitionDto,
  ) {
    return this.requisitionService.issue(id, organizationId, userId, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.requisitionService.cancel(id, organizationId);
  }

  @Delete(':id')
  remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.requisitionService.remove(id, organizationId);
  }
}
