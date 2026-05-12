import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CreateStockTransferDto,
  UpdateStockTransferStatusDto,
  StockTransferQueryDto,
} from './dto/stock-transfer.dto';
import { StockTransferService } from './stock-tranfer.service';
import { JwtGuard } from '../auth/guard';

@Controller('stock-transfers')
@UseGuards(JwtGuard)
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  @Post()
  create(
    @Body() createStockTransferDto: CreateStockTransferDto,
    @Request() req: any,
  ) {
    try {
      // Safely extract user info with fallbacks
      const userId = req.user?.id || req.user?.userId;
      const userName = req.user?.fullName || req.user?.name || 'Unknown User';

      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.stockTransferService.create(
        createStockTransferDto,
        userId,
        userName,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create stock transfer',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  findAll(@Request() req: any, @Query() query: StockTransferQueryDto) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Extract organizationId if present (string -> number)
      const orgId = query.organizationId
        ? Number(query.organizationId)
        : undefined;
      if (query.organizationId && isNaN(orgId)) {
        throw new HttpException(
          'organizationId must be a number',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.stockTransferService.findAll(userId, orgId, query);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch stock transfers',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.stockTransferService.findOne(id, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch stock transfer',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStockTransferStatusDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userName = req.user?.fullName || req.user?.name || 'Unknown User';

      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.stockTransferService.updateStatus(
        id,
        updateStatusDto,
        userId,
        userName,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update stock transfer status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.stockTransferService.cancel(id, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel stock transfer',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('organization/:organizationId/stats')
  getTransferStats(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        throw new HttpException(
          'User authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.stockTransferService.getTransferStats(organizationId, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get transfer stats',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}

// Added in October 2025: Enhanced pagination & filtering parameters supported:
// Query params: page, pageSize, startDate, endDate, search, status, organizationId
// Example: GET /stock-transfers?page=2&pageSize=25&startDate=2025-10-01&endDate=2025-10-08&search=ST-123&status=APPROVED,COMPLETED
