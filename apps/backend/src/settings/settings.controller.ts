import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSettingsDto, UpdateSettingsDto } from './settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getByOrganization(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization settings' })
  @ApiResponse({ status: 201, description: 'Settings created successfully' })
  @ApiResponse({ status: 409, description: 'Settings already exist' })
  async create(@Body() dto: CreateSettingsDto) {
    return this.settingsService.create(dto);
  }

  @Put('organization/:organizationId')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.update(organizationId, dto);
  }

  @Patch('organization/:organizationId/section/:section')
  @ApiOperation({ summary: 'Update specific settings section' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({
    name: 'section',
    enum: [
      'payment',
      'tax',
      'general',
      'prefixes',
      'display',
      'reporting',
      'recurring',
      'inventory',
      'notifications',
      'receipt',
      'business',
      'documents',
    ],
  })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  async updateSection(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('section') section: string,
    @Body() data: Partial<UpdateSettingsDto>,
  ) {
    return this.settingsService.updateSection(
      organizationId,
      section as any,
      data,
    );
  }

  @Post('organization/:organizationId/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset settings to defaults' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Settings reset successfully' })
  async resetToDefaults(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.resetToDefaults(organizationId);
  }

  @Get('organization/:organizationId/payment-methods')
  @ApiOperation({ summary: 'Get payment methods configuration' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getPaymentMethods(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getPaymentMethods(organizationId);
  }

  @Patch('organization/:organizationId/payment-methods')
  @ApiOperation({ summary: 'Update payment methods configuration' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async updatePaymentMethods(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body()
    paymentMethods: {
      cash?: boolean;
      mpesa?: boolean;
      bank?: boolean;
      credit?: boolean;
    },
  ) {
    return this.settingsService.updatePaymentMethods(
      organizationId,
      paymentMethods,
    );
  }

  @Get('organization/:organizationId/tax')
  @ApiOperation({ summary: 'Get tax settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getTaxSettings(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getTaxSettings(organizationId);
  }

  @Get('organization/:organizationId/prefix/:type')
  @ApiOperation({ summary: 'Get document prefix' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({
    name: 'type',
    enum: [
      'invoice',
      'sale',
      'quotation',
      'lpo',
      'payment',
      'expense',
      'creditSale',
    ],
  })
  async getPrefix(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('type') type: string,
  ) {
    const prefix = await this.settingsService.getPrefix(
      organizationId,
      type as any,
    );
    return { prefix };
  }

  @Get('organization/:organizationId/currency')
  @ApiOperation({ summary: 'Get currency settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getCurrencySettings(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getCurrencySettings(organizationId);
  }

  @Get('organization/:organizationId/datetime')
  @ApiOperation({ summary: 'Get date/time format settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getDateTimeSettings(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getDateTimeSettings(organizationId);
  }

  @Get('organization/:organizationId/fiscal-year')
  @ApiOperation({ summary: 'Get fiscal year settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getFiscalYearSettings(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getFiscalYearSettings(organizationId);
  }

  @Get('organization/:organizationId/reporting-period')
  @ApiOperation({ summary: 'Get reporting period settings' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  async getReportingPeriodSettings(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.settingsService.getReportingPeriodSettings(organizationId);
  }
}
