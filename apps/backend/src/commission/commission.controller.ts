import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtGuard } from '../auth/guard';
import {
  UserProductCommissionDto,
  MarkCommissionPaidDto,
} from './commission.dto';

@Controller('commission')
@UseGuards(JwtGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  /**
   * Get commission summary for a user
   */
  @Get('summary/:userId')
  async getUserSummary(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionService.getUserCommissionSummary(
      parseInt(organizationId),
      parseInt(userId),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get commission records for a user
   */
  @Get('records/:userId')
  async getUserRecords(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
    @Query('status') status?: string,
  ) {
    return this.commissionService.getUserCommissionRecords(
      parseInt(organizationId),
      parseInt(userId),
      status,
    );
  }

  /**
   * Set or update user-specific commission rate for a product
   */
  @Post('user-rate')
  async setUserRate(
    @Body() dto: UserProductCommissionDto,
    @Query('organizationId') organizationId: string,
    @Req() req: any,
  ) {
    return this.commissionService.setUserProductCommission(
      parseInt(organizationId),
      dto,
      req.user?.fullName || 'System',
    );
  }

  /**
   * Get all user-specific commission rates for a user
   */
  @Get('user-rates/:userId')
  async getUserRates(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.commissionService.getUserProductCommissions(
      parseInt(organizationId),
      parseInt(userId),
    );
  }

  /**
   * Delete user-specific commission rate
   */
  @Delete('user-rate/:userId/:productId')
  async deleteUserRate(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.commissionService.deleteUserProductCommission(
      parseInt(userId),
      parseInt(productId),
    );
  }

  /**
   * Mark commissions as paid
   */
  @Post('mark-paid')
  async markAsPaid(
    @Body() dto: MarkCommissionPaidDto,
    @Query('organizationId') organizationId: string,
    @Req() req: any,
  ) {
    return this.commissionService.markCommissionsAsPaid(
      parseInt(organizationId),
      dto,
      req.user?.fullName || 'System',
    );
  }

  /**
   * Get all commission payments
   */
  @Get('payments')
  async getPayments(@Query('organizationId') organizationId: string) {
    return this.commissionService.getCommissionPayments(
      parseInt(organizationId),
    );
  }

  /**
   * Get organization commission statistics
   */
  @Get('stats')
  async getStats(@Query('organizationId') organizationId: string) {
    return this.commissionService.getOrganizationCommissionStats(
      parseInt(organizationId),
    );
  }

  /**
   * Get commission report grouped by user for a date range
   */
  @Get('report')
  async getReport(
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.commissionService.getCommissionReport(
      parseInt(organizationId),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      status || undefined,
    );
  }

  /**
   * Calculate commission preview for items (before creating order)
   */
  @Post('calculate-preview')
  async calculatePreview(
    @Body()
    body: {
      userId: number;
      items: Array<{ productId: number; quantity: number; unitPrice: number }>;
    },
    @Query('organizationId') organizationId: string,
  ) {
    // Ensure userId is a number (convert if needed)
    const userIdNum = typeof body.userId === 'string' ? parseInt(body.userId) : body.userId;

    console.log('📊 [COMMISSION PREVIEW] Request received:', {
      organizationId,
      userId: userIdNum,
      userIdType: typeof userIdNum,
      itemsCount: body.items?.length,
      items: body.items,
    });

    const result = await this.commissionService.calculateCommissionPreview(
      parseInt(organizationId),
      userIdNum,
      body.items,
    );

    console.log('📊 [COMMISSION PREVIEW] Response:', {
      totalCommission: result.totalCommission,
      itemsWithCommission: result.items.filter((i) => i.hasCommission).length,
      itemsWithoutCommission: result.items.filter((i) => !i.hasCommission)
        .length,
    });

    return result;
  }
}
