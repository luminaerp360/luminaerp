import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { SystemLogsService } from './system-logs.service';
import { CreateSystemLogDto, FilterSystemLogsDto } from './dto';
import { JwtGuard } from '../auth/guard';
import { Request } from 'express';

@Controller('organizations/:organizationId/system-logs')
@UseGuards(JwtGuard)
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Post()
  async createLog(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateSystemLogDto,
    @Req() req: Request,
  ) {
    console.log('🔍 [SystemLogs] Creating log for org:', organizationId);
    console.log('📝 [SystemLogs] DTO:', dto);
    // Auto-capture IP and User-Agent if not provided
    if (!dto.ipAddress) {
      dto.ipAddress = req.ip || req.socket.remoteAddress;
    }
    if (!dto.userAgent) {
      dto.userAgent = req.headers['user-agent'];
    }
    const result = await this.systemLogsService.createLog(organizationId, dto);
    console.log('✅ [SystemLogs] Created log with ID:', result.id);
    return result;
  }

  @Get()
  async getLogs(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filters: FilterSystemLogsDto,
  ) {
    console.log('🔍 [SystemLogs] Getting logs for org:', organizationId);
    console.log('🔎 [SystemLogs] Filters:', filters);
    const result = await this.systemLogsService.getLogs(
      organizationId,
      filters,
    );
    console.log(
      '📊 [SystemLogs] Found',
      result.total,
      'logs, returning',
      result.data.length,
      'on page',
      result.page,
    );
    return result;
  }

  @Get('recent')
  async getRecentActivity(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('limit') limit?: string,
  ) {
    return this.systemLogsService.getRecentActivity(
      organizationId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('stats')
  async getActivityStats(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('days') days?: string,
  ) {
    return this.systemLogsService.getActivityStats(
      organizationId,
      days ? parseInt(days) : 7,
    );
  }

  @Get('user/:userId')
  async getUserActivity(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ) {
    return this.systemLogsService.getUserActivity(
      organizationId,
      userId,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  async getLogById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.systemLogsService.getLogById(organizationId, id);
  }

  @Delete('cleanup')
  async deleteOldLogs(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('daysToKeep') daysToKeep?: string,
  ) {
    return this.systemLogsService.deleteOldLogs(
      organizationId,
      daysToKeep ? parseInt(daysToKeep) : 90,
    );
  }
}
