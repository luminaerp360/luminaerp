import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: createNotificationDto,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(
    organizationId: number,
    userId: number | null,
    filters: FilterNotificationsDto,
  ) {
    const { type, isRead, page = 1, limit = 20 } = filters;

    const where: any = {
      organizationId,
    };

    // If userId is provided, filter by user or global notifications (userId = null)
    if (userId !== null) {
      where.OR = [
        { userId },
        { userId: null }, // Global notifications
      ];
    }

    if (type) {
      where.type = type;
    }

    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, organizationId: number) {
    return this.prisma.notification.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    organizationId: number,
    updateNotificationDto: UpdateNotificationDto,
  ) {
    const notification = await this.findOne(id, organizationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        ...updateNotificationDto,
        readAt: updateNotificationDto.isRead ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async markAsRead(id: number, organizationId: number) {
    return this.update(id, organizationId, { isRead: true });
  }

  async markAllAsRead(organizationId: number, userId: number | null) {
    const where: any = {
      organizationId,
      isRead: false,
    };

    if (userId !== null) {
      where.OR = [{ userId }, { userId: null }];
    }

    return this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async remove(id: number, organizationId: number) {
    const notification = await this.findOne(id, organizationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(organizationId: number, userId: number | null) {
    const where: any = {
      organizationId,
      isRead: false,
    };

    if (userId !== null) {
      where.OR = [{ userId }, { userId: null }];
    }

    return this.prisma.notification.count({ where });
  }

  async deleteOldNotifications(organizationId: number, daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.setDate(cutoffDate.getDate() - daysOld));

    return this.prisma.notification.deleteMany({
      where: {
        organizationId,
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });
  }

  // Helper method to create different types of notifications
  async createSystemNotification(
    organizationId: number,
    userId: number | null,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    link?: string,
    data?: any,
  ) {
    return this.create({
      organizationId,
      userId,
      type,
      title,
      message,
      link,
      icon: this.getIconForType(type),
      data,
    });
  }

  private getIconForType(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      SYSTEM: 'notifications',
      SALE: 'shopping_cart',
      INVOICE: 'receipt',
      PAYMENT: 'payment',
      INVENTORY: 'inventory',
      USER: 'person',
      TICKET: 'support',
      ALERT: 'warning',
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
    };
    return iconMap[type] || 'notifications';
  }
}
