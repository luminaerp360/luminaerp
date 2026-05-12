import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderDto } from './orders.dto';
import { OrdersService } from './orders.service';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { RefundDto } from './refund.dto';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('organizations/:organizationId/orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @Post()
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.SALES,
    description: 'Created a new sale/order',
    entityType: 'Order',
  })
  async createOrder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: OrderDto,
    @GetUser() user: User,
  ) {
    return this.orderService.createOrder(organizationId, dto, user.id);
  }

  @Post('refund')
  async refundOrder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: RefundDto,
  ) {
    return this.orderService.refundOrder(organizationId, dto);
  }

  @Get()
  async getAllOrders(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.orderService.getAllOrders(organizationId);
  }

  @Get('report/day')
  async getReportForDay(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('date') date: string,
  ) {
    return this.orderService.getReportForDay(organizationId, date);
  }

  @Get('report/month')
  async getReportForMonth(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.orderService.getReportForMonth(organizationId, year, month);
  }

  @Get('report/range')
  async getReportForDateRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('search') search?: string,
  ) {
    return this.orderService.getReportForDateRange(
      organizationId,
      startDate,
      endDate,
      search,
    );
  }

  @Get('voided')
  async getVoidedOrders(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.orderService.getVoidedOrders(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  async getOrderById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderById(organizationId, id);
  }

  @Put(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.SALES,
    description: 'Updated sale/order details',
    entityType: 'Order',
  })
  async updateOrder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderDto,
  ) {
    return this.orderService.updateOrder(organizationId, id, dto);
  }

  @Put(':id/void')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.SALES,
    description: 'Voided a sale/order',
    entityType: 'Order',
  })
  async softDeleteOrder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.orderService.softDeleteOrder(organizationId, id, user.id);
  }

  @Delete(':id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.SALES,
    description: 'Permanently deleted a sale/order',
    entityType: 'Order',
  })
  async deleteOrder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.deleteOrder(organizationId, id);
  }
}
