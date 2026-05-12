import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  InventoryDto,
  ApprovePurchaseDto,
  ReceivePurchaseDto,
} from './inventory.dto';
import { Inventory } from '@prisma/client';

@Controller('organizations/:organizationId/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post()
  async createInventory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: InventoryDto,
  ): Promise<Inventory> {
    return this.inventoryService.createInventory(organizationId, dto);
  }

  @Get()
  async getAllInventories(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<Inventory[]> {
    return this.inventoryService.getAllInventories(organizationId);
  }

  @Get('report/day')
  async getInventoryReportForDay(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('date') dateString: string,
  ): Promise<Inventory[]> {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return this.inventoryService.getInventoryReportForDay(organizationId, date);
  }

  @Get('report/range')
  async getInventoryReportForTimeRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDateString: string,
    @Query('endDate') endDateString: string,
  ): Promise<Inventory[]> {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return this.inventoryService.getInventoryReportForTimeRange(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  async getInventoryById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Inventory> {
    return this.inventoryService.getInventoryById(organizationId, id);
  }

  @Put(':id')
  async updateInventory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InventoryDto,
  ): Promise<Inventory> {
    return this.inventoryService.updateInventory(organizationId, id, dto);
  }

  @Put(':id/approve')
  async approvePurchase(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovePurchaseDto,
  ): Promise<Inventory> {
    return this.inventoryService.approvePurchase(
      organizationId,
      id,
      dto.approvedBy,
    );
  }

  @Put(':id/receive')
  async receivePurchase(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceivePurchaseDto,
  ): Promise<Inventory> {
    return this.inventoryService.receivePurchase(
      organizationId,
      id,
      dto.receivedBy,
      dto.items,
    );
  }

  @Put(':id/cancel')
  async cancelPurchase(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Inventory> {
    return this.inventoryService.cancelPurchase(organizationId, id);
  }

  @Delete(':id')
  async deleteInventory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.inventoryService.deleteInventory(organizationId, id);
  }
}
