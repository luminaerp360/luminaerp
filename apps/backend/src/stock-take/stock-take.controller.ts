import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StockTakeService } from './stock-take.service';
import {
  CreateStockTakeDto,
  CompleteStockTakeDto,
  StockTakeQueryDto,
} from './dto/stock-take.dto';
import { JwtGuard } from '../auth/guard';

@Controller('stock-takes')
@UseGuards(JwtGuard)
export class StockTakeController {
  constructor(private readonly stockTakeService: StockTakeService) {}

  @Post()
  async create(@Body() dto: CreateStockTakeDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    const userName = req.user?.fullName || req.user?.name || 'Unknown User';
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.create(organizationId, dto, userId, userName);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: StockTakeQueryDto) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.findAll(organizationId, query);
  }

  @Get('summary')
  async getSummary(@Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.getSummary(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.findOne(organizationId, id);
  }

  @Patch(':id/complete')
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteStockTakeDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const userName = req.user?.fullName || req.user?.name || 'Unknown User';
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.complete(
      organizationId,
      id,
      dto,
      userId,
      userName,
    );
  }

  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.cancel(organizationId, id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException(
        'User authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.stockTakeService.delete(organizationId, id);
  }
}
