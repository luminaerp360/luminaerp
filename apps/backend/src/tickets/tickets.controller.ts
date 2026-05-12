import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateResponseDto,
  FilterTicketsDto,
} from './dto';
import { JwtGuard } from '../auth/guard';

// Organization-specific ticket routes
@Controller('organizations/:organizationId/tickets')
@UseGuards(JwtGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async createTicket(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(organizationId, dto);
  }

  @Get()
  async getOrganizationTickets(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filters: FilterTicketsDto,
  ) {
    return this.ticketsService.getTicketsByOrganization(
      organizationId,
      filters,
    );
  }

  @Get('stats')
  async getTicketStats(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.ticketsService.getTicketStats(organizationId);
  }

  @Get(':id')
  async getTicketById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.getTicketById(id, organizationId);
  }

  @Put(':id')
  async updateTicket(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateTicket(id, dto, organizationId);
  }

  @Post(':id/responses')
  async addResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateResponseDto,
  ) {
    return this.ticketsService.addResponse(id, dto);
  }

  @Delete(':id')
  async deleteTicket(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.deleteTicket(id, organizationId);
  }
}

// Super Admin routes (access all tickets across organizations)
@Controller('admin/tickets')
@UseGuards(JwtGuard)
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getAllTickets(@Query() filters: FilterTicketsDto) {
    console.log(
      '🔑 [AdminTicketsController] Super admin accessing all tickets',
    );
    return this.ticketsService.getAllTickets(filters);
  }

  @Get('stats')
  async getAllTicketStats() {
    console.log('🔑 [AdminTicketsController] Getting global ticket stats');
    return this.ticketsService.getTicketStats();
  }

  @Get(':id')
  async getTicketById(@Param('id', ParseIntPipe) id: number) {
    console.log('🔑 [AdminTicketsController] Getting ticket:', id);
    return this.ticketsService.getTicketById(id);
  }

  @Put(':id')
  async updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
  ) {
    console.log('🔑 [AdminTicketsController] Updating ticket:', id);
    return this.ticketsService.updateTicket(id, dto);
  }

  @Post(':id/responses')
  async addAdminResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateResponseDto,
  ) {
    console.log('🔑 [AdminTicketsController] Adding admin response to:', id);
    // Ensure isAdmin is true for admin responses
    dto.isAdmin = true;
    return this.ticketsService.addResponse(id, dto);
  }

  @Delete(':id')
  async deleteTicket(@Param('id', ParseIntPipe) id: number) {
    console.log('🔑 [AdminTicketsController] Deleting ticket:', id);
    return this.ticketsService.deleteTicket(id);
  }
}
