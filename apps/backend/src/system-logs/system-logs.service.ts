import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemLogDto, FilterSystemLogsDto } from './dto';

@Injectable()
export class SystemLogsService {
  constructor(private prisma: PrismaService) {}

  async createLog(organizationId: number, dto: CreateSystemLogDto) {
    console.log('💾 [SystemLogsService] Creating log in database');
    console.log('   Organization ID:', organizationId);
    console.log('   User ID:', dto.userId);
    console.log('   Action:', dto.action);
    console.log('   Module:', dto.module);

    // Skip logging if userId or organizationId is missing (required by schema)
    if (!dto.userId || !organizationId) {
      console.warn(
        '⚠️ [SystemLogsService] Skipping log - missing userId or organizationId',
      );
      return null;
    }

    const log = await this.prisma.systemLog.create({
      data: {
        organization: { connect: { id: organizationId } },
        user: { connect: { id: dto.userId } },
        action: dto.action,
        module: dto.module,
        description: dto.description,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
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

    console.log('✨ [SystemLogsService] Log created successfully:', log.id);
    return log;
  }

  async getLogs(organizationId: number, filters: FilterSystemLogsDto) {
    const { page = 1, limit = 50, startDate, endDate, ...where } = filters;
    const skip = (page - 1) * limit;

    console.log('🔎 [SystemLogsService] Querying logs');
    console.log('   Organization ID:', organizationId);
    console.log('   Page:', page, 'Limit:', limit, 'Skip:', skip);
    console.log('   Filters:', { ...where, startDate, endDate });

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    const whereClause = {
      organizationId,
      ...where,
      ...dateFilter,
    };
    console.log('   Final WHERE clause:', JSON.stringify(whereClause, null, 2));

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where: whereClause,
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
        skip,
        take: limit,
      }),
      this.prisma.systemLog.count({
        where: whereClause,
      }),
    ]);

    console.log('📈 [SystemLogsService] Query results:');
    console.log('   Total logs found:', total);
    console.log('   Logs returned:', logs.length);
    console.log(
      '   Sample log IDs:',
      logs.slice(0, 3).map((l) => l.id),
    );

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLogById(organizationId: number, id: number) {
    return this.prisma.systemLog.findFirst({
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
      },
    });
  }

  async getRecentActivity(organizationId: number, limit: number = 10) {
    return this.prisma.systemLog.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getUserActivity(
    organizationId: number,
    userId: number,
    limit: number = 20,
  ) {
    return this.prisma.systemLog.findMany({
      where: {
        organizationId,
        userId,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getActivityStats(organizationId: number, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.systemLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        action: true,
        module: true,
        createdAt: true,
      },
    });

    const stats = {
      totalActivities: logs.length,
      byAction: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by module
      stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;

      // Count by day
      const day = log.createdAt.toISOString().split('T')[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return stats;
  }

  async deleteOldLogs(organizationId: number, daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemLog.deleteMany({
      where: {
        organizationId,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      deleted: result.count,
      message: `Deleted ${result.count} logs older than ${daysToKeep} days`,
    };
  }
}
