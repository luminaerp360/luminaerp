import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './payment-method.dto';

@ApiTags('Payment Methods')
@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiResponse({ status: 201, description: 'Payment method created successfully' })
  @ApiResponse({ status: 409, description: 'Payment method code already exists' })
  async create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodService.create(dto);
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all payment methods for an organization' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async findByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.paymentMethodService.findByOrganization(organizationId);
  }

  @Get('organization/:organizationId/enabled')
  @ApiOperation({ summary: 'Get enabled payment methods for an organization' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Enabled payment methods retrieved successfully' })
  async findEnabledByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.paymentMethodService.findEnabledByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment method by ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment method retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a payment method' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle payment method enabled status' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment method toggled successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodService.toggleEnabled(id);
  }

  @Post('organization/:organizationId/reorder')
  @ApiOperation({ summary: 'Reorder payment methods' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Payment methods reordered successfully' })
  async reorder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() body: { orderedIds: number[] },
  ) {
    return this.paymentMethodService.reorder(organizationId, body.orderedIds);
  }

  @Post('organization/:organizationId/settings/:settingsId/initialize')
  @ApiOperation({ summary: 'Initialize default payment methods' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'settingsId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Default payment methods initialized' })
  async initializeDefaults(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('settingsId', ParseIntPipe) settingsId: number,
  ) {
    return this.paymentMethodService.initializeDefaults(settingsId, organizationId);
  }
}
