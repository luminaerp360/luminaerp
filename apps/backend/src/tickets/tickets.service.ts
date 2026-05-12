import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateResponseDto,
  FilterTicketsDto,
} from './dto';
import { TicketStatus } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // Create a new ticket
  async createTicket(organizationId: number, dto: CreateTicketDto) {
    console.log('🎫 [TicketsService] Creating ticket');
    console.log('   Organization ID:', organizationId);
    console.log('   User ID:', dto.userId);
    console.log('   Title:', dto.title);

    const ticket = await this.prisma.ticket.create({
      data: {
        organizationId,
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        category: dto.category || 'OTHER',
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

    console.log('✅ [TicketsService] Ticket created:', ticket.id);
    return ticket;
  }

  // Get tickets for an organization
  async getTicketsByOrganization(
    organizationId: number,
    filters: FilterTicketsDto,
  ) {
    const { page = 1, limit = 20, ...where } = filters;
    const skip = (page - 1) * limit;

    console.log('📋 [TicketsService] Getting tickets for org:', organizationId);
    console.log('   Filters:', filters);

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          organizationId,
          ...where,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          responses: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1, // Get latest response
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // Open tickets first
          { priority: 'desc' }, // Urgent first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({
        where: {
          organizationId,
          ...where,
        },
      }),
    ]);

    console.log('📊 [TicketsService] Found', total, 'tickets');

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Super Admin: Get all tickets across all organizations
  async getAllTickets(filters: FilterTicketsDto) {
    const { page = 1, limit = 20, ...where } = filters;
    const skip = (page - 1) * limit;

    console.log('🌐 [TicketsService] Getting ALL tickets (Super Admin)');
    console.log('   Filters:', filters);

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          ...where,
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
          responses: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({
        where: {
          ...where,
        },
      }),
    ]);

    console.log('📊 [TicketsService] Found', total, 'tickets across all orgs');

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get single ticket by ID
  async getTicketById(ticketId: number, organizationId?: number) {
    console.log('🔍 [TicketsService] Getting ticket:', ticketId);

    const whereClause: any = { id: ticketId };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: whereClause,
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
        responses: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  // Update ticket (status, priority, assignment)
  async updateTicket(
    ticketId: number,
    dto: UpdateTicketDto,
    organizationId?: number,
  ) {
    console.log('✏️ [TicketsService] Updating ticket:', ticketId);
    console.log('   Updates:', dto);

    const whereClause: any = { id: ticketId };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Check if ticket exists
    const ticket = await this.prisma.ticket.findFirst({
      where: whereClause,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { ...dto };

    // If status is being set to RESOLVED or CLOSED, set resolvedAt
    if (
      dto.status === TicketStatus.RESOLVED ||
      dto.status === TicketStatus.CLOSED
    ) {
      updateData.resolvedAt = new Date();
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
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

    console.log('✅ [TicketsService] Ticket updated');
    return updatedTicket;
  }

  // Add response/comment to ticket
  async addResponse(ticketId: number, dto: CreateResponseDto) {
    console.log('💬 [TicketsService] Adding response to ticket:', ticketId);
    console.log('   User ID:', dto.userId);
    console.log('   Is Admin:', dto.isAdmin);

    // Check if ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const response = await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        userId: dto.userId,
        message: dto.message,
        isAdmin: dto.isAdmin || false,
      },
    });

    // If admin is responding, update ticket status to IN_PROGRESS
    if (dto.isAdmin && ticket.status === TicketStatus.OPEN) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    console.log('✅ [TicketsService] Response added');
    return response;
  }

  // Get ticket statistics for dashboard
  async getTicketStats(organizationId?: number) {
    console.log('📊 [TicketsService] Getting ticket statistics');

    const whereClause: any = {};
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const [total, open, inProgress, resolved, closed, byPriority, byCategory] =
      await Promise.all([
        this.prisma.ticket.count({ where: whereClause }),
        this.prisma.ticket.count({
          where: { ...whereClause, status: TicketStatus.OPEN },
        }),
        this.prisma.ticket.count({
          where: { ...whereClause, status: TicketStatus.IN_PROGRESS },
        }),
        this.prisma.ticket.count({
          where: { ...whereClause, status: TicketStatus.RESOLVED },
        }),
        this.prisma.ticket.count({
          where: { ...whereClause, status: TicketStatus.CLOSED },
        }),
        this.prisma.ticket.groupBy({
          by: ['priority'],
          where: whereClause,
          _count: true,
        }),
        this.prisma.ticket.groupBy({
          by: ['category'],
          where: whereClause,
          _count: true,
        }),
      ]);

    return {
      total,
      byStatus: {
        open,
        inProgress,
        resolved,
        closed,
      },
      byPriority: byPriority.reduce(
        (acc, item) => {
          acc[item.priority] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // Delete ticket (soft delete or hard delete)
  async deleteTicket(ticketId: number, organizationId?: number) {
    console.log('🗑️ [TicketsService] Deleting ticket:', ticketId);

    const whereClause: any = { id: ticketId };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: whereClause,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.prisma.ticket.delete({
      where: { id: ticketId },
    });

    console.log('✅ [TicketsService] Ticket deleted');
    return { message: 'Ticket deleted successfully' };
  }
}
