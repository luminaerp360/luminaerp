import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OfflineSubscriptionService } from './offline-subscription.service';
import { CreateOfflineSubscriptionDto } from './dto/create-offline-subscription.dto';
import { ValidateSubscriptionDto } from './dto/validate-subscription.dto';
import { ExtendSubscriptionDto } from './dto/extend-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Controller('offline-subscription')
export class OfflineSubscriptionController {
  constructor(
    private readonly offlineSubscriptionService: OfflineSubscriptionService,
  ) {}

  /**
   * Create a new offline subscription
   * POST /offline-subscription
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOfflineSubscription(@Body() dto: CreateOfflineSubscriptionDto) {
    return this.offlineSubscriptionService.createOfflineSubscription(dto);
  }

  /**
   * Validate subscription - PUBLIC ENDPOINT
   * POST /offline-subscription/validate
   * This endpoint is public and can be called without authentication
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateSubscription(@Body() dto: ValidateSubscriptionDto) {
    return this.offlineSubscriptionService.validateSubscription(dto);
  }

  /**
   * Extend an existing subscription
   * POST /offline-subscription/extend
   */
  @Post('extend')
  @HttpCode(HttpStatus.OK)
  extendSubscription(@Body() dto: ExtendSubscriptionDto) {
    return this.offlineSubscriptionService.extendSubscription(dto);
  }

  /**
   * Get all offline subscriptions with optional status filter
   * GET /offline-subscription
   */
  @Get()
  getAllOfflineSubscriptions(@Query('status') status?: SubscriptionStatus) {
    return this.offlineSubscriptionService.getAllOfflineSubscriptions(status);
  }

  /**
   * Get subscription by license key - PUBLIC ENDPOINT
   * GET /offline-subscription/license/:licenseKey
   */
  @Get('license/:licenseKey')
  getSubscriptionByLicenseKey(@Param('licenseKey') licenseKey: string) {
    return this.offlineSubscriptionService.getSubscriptionByLicenseKey(
      licenseKey,
    );
  }

  /**
   * Suspend a subscription
   * PATCH /offline-subscription/:licenseKey/suspend
   */
  @Patch(':licenseKey/suspend')
  suspendSubscription(
    @Param('licenseKey') licenseKey: string,
    @Body() body: { reason?: string },
  ) {
    return this.offlineSubscriptionService.suspendSubscription(
      licenseKey,
      body.reason,
    );
  }

  /**
   * Reactivate a suspended subscription
   * PATCH /offline-subscription/:licenseKey/reactivate
   */
  @Patch(':licenseKey/reactivate')
  reactivateSubscription(@Param('licenseKey') licenseKey: string) {
    return this.offlineSubscriptionService.reactivateSubscription(licenseKey);
  }

  /**
   * Import organization data to offline database
   * POST /offline-subscription/:licenseKey/import
   */
  @Post(':licenseKey/import')
  @HttpCode(HttpStatus.OK)
  importOrganizationData(
    @Param('licenseKey') licenseKey: string,
    @Body() body: { data: any },
  ) {
    return this.offlineSubscriptionService.importOrganizationData(
      licenseKey,
      body.data,
    );
  }
}
