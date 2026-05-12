import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';

@Controller('organizations/:orgId/notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create({
      ...createNotificationDto,
      organizationId: orgId,
    });
  }

  @Get()
  findAll(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: any,
    @Query() filters: FilterNotificationsDto,
  ) {
    const userId = req.user?.id || null;
    return this.notificationsService.findAll(orgId, userId, filters);
  }

  @Get('unread-count')
  async getUnreadCount(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    const count = await this.notificationsService.getUnreadCount(orgId, userId);
    return { count };
  }

  @Get(':id')
  findOne(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, orgId, updateNotificationDto);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(id, orgId);
  }

  @Post('mark-all-read')
  markAllAsRead(@Param('orgId', ParseIntPipe) orgId: number, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.notificationsService.markAllAsRead(orgId, userId);
  }

  @Delete(':id')
  remove(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.remove(id, orgId);
  }

  @Delete('cleanup/old')
  cleanupOldNotifications(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    return this.notificationsService.deleteOldNotifications(orgId, days);
  }
}
