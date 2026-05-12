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
import { StorePurchaseService } from './store-purchase.service';
import { CreateStorePurchaseDto } from './dto/create-store-purchase.dto';
import { UpdateStorePurchaseDto } from './dto/update-store-purchase.dto';
import { ReceiveStorePurchaseDto } from './dto/receive-store-purchase.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';
import { PurchaseStatus } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/store-purchases')
export class StorePurchaseController {
  constructor(private readonly storePurchaseService: StorePurchaseService) {}

  @Post()
  create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @GetUser('id') userId: number,
    @Body() dto: CreateStorePurchaseDto,
  ) {
    return this.storePurchaseService.create(dto, organizationId, userId);
  }

  @Get()
  findAll(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('status') status?: PurchaseStatus,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.storePurchaseService.findAll(organizationId, {
      status,
      supplierId: supplierId ? +supplierId : undefined,
      startDate,
      endDate,
    });
  }

  @Get(':id/grn')
  getGrn(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storePurchaseService.getGrn(id, organizationId);
  }

  @Get(':id/receives')
  getReceiveHistory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storePurchaseService.getReceiveHistory(id, organizationId);
  }

  @Get(':id/receives/:receiveId/grn')
  getReceiveGrn(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('receiveId', ParseIntPipe) receiveId: number,
  ) {
    return this.storePurchaseService.getReceiveGrn(
      id,
      receiveId,
      organizationId,
    );
  }

  @Get(':id')
  findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storePurchaseService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStorePurchaseDto,
  ) {
    return this.storePurchaseService.update(id, dto, organizationId);
  }

  @Patch(':id/approve')
  approve(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.storePurchaseService.approve(id, organizationId, userId);
  }

  @Patch(':id/reject')
  reject(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body('reason') reason: string,
  ) {
    return this.storePurchaseService.reject(
      id,
      organizationId,
      userId,
      reason || 'No reason provided',
    );
  }

  @Patch(':id/receive')
  receive(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() dto: ReceiveStorePurchaseDto,
  ) {
    return this.storePurchaseService.receive(id, organizationId, userId, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storePurchaseService.cancel(id, organizationId);
  }

  @Delete(':id')
  remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storePurchaseService.remove(id, organizationId);
  }
}
