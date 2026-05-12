import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { SupplierDto } from './suppliersDto.dto';
import { SuppliersService } from './surpliers.service';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('organizations/:organizationId/suppliers')
@UseGuards(JwtGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.SUPPLIERS,
    description: 'Created a new supplier',
    entityType: 'Supplier',
  })
  async createSupplier(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: SupplierDto,
  ) {
    return this.suppliersService.createSupplier(organizationId, dto);
  }

  @Get()
  async getAllSuppliers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.suppliersService.getAllSuppliers(organizationId);
  }

  @Get(':id')
  async getSupplierById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suppliersService.getSupplierById(organizationId, id);
  }

  @Put(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.SUPPLIERS,
    description: 'Updated supplier details',
    entityType: 'Supplier',
  })
  async updateSupplier(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SupplierDto,
  ) {
    return this.suppliersService.updateSupplier(organizationId, id, dto);
  }

  @Delete(':id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.SUPPLIERS,
    description: 'Deleted a supplier',
    entityType: 'Supplier',
  })
  async deleteSupplier(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suppliersService.deleteSupplier(organizationId, id);
  }
}
