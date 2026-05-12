import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LpoService } from './lpo.service';
import { LpoDto, ConvertToPurchaseDto, RejectLpoDto } from './lpo.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';

@Controller('organizations/:organizationId/lpo')
@UseGuards(JwtGuard)
export class LpoController {
  constructor(private readonly lpoService: LpoService) {}

  @Post()
  async createLpo(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: LpoDto,
  ) {
    return this.lpoService.createLpo(organizationId, dto);
  }

  @Get()
  async getAllLpos(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.lpoService.getAllLpos(organizationId);
  }

  @Get('pending')
  async getPendingLpos(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.lpoService.getPendingLpos(organizationId);
  }

  @Get('approved')
  async getApprovedLpos(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.lpoService.getApprovedLpos(organizationId);
  }

  @Get('range')
  async getLposByDateRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.lpoService.getLposByDateRange(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  async getLpoById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.lpoService.getLpoById(organizationId, id);
  }

  @Put(':id')
  async updateLpo(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LpoDto,
  ) {
    return this.lpoService.updateLpo(organizationId, id, dto);
  }

  @Put(':id/approve')
  async approveLpo(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.lpoService.approveLpo(organizationId, id, user.id);
  }

  @Put(':id/reject')
  async rejectLpo(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectLpoDto,
    @GetUser() user: User,
  ) {
    return this.lpoService.rejectLpo(
      organizationId,
      id,
      user.id,
      dto.rejectionReason,
    );
  }

  @Post(':id/convert-to-purchase')
  async convertToPurchase(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertToPurchaseDto,
    @GetUser() user: User,
  ) {
    return this.lpoService.convertToPurchase(organizationId, id, user.id, dto);
  }

  @Delete(':id')
  async deleteLpo(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.lpoService.deleteLpo(organizationId, id);
  }
}
