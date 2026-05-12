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
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customerDto.dto';
import { JwtGuard } from 'src/auth/guard';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('organizations/:organizationId/customers')
@UseGuards(JwtGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.CUSTOMERS,
    description: 'Created a new customer',
    entityType: 'Customer',
  })
  async createCustomer(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createCustomer(organizationId, dto);
  }

  @Get()
  async getAllCustomers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.customersService.getAllCustomers(organizationId);
  }

  @Get('active')
  async getActiveCustomers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.customersService.getActiveCustomers(organizationId);
  }

  @Get('due-credit')
  async getCustomersByDueCredit(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('minDueCredit', ParseIntPipe) minDueCredit: number,
  ) {
    return this.customersService.getCustomersByDueCredit(
      organizationId,
      minDueCredit,
    );
  }

  @Get(':id')
  async getCustomerById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customersService.getCustomerById(organizationId, id);
  }

  @Put(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.CUSTOMERS,
    description: 'Updated customer details',
    entityType: 'Customer',
  })
  async updateCustomer(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto, // Changed to use UpdateCustomerDto
  ) {
    const updatedCustomer = await this.customersService.updateCustomer(
      organizationId,
      id,
      dto,
    );

    // Return a clear success response
    return {
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.CUSTOMERS,
    description: 'Deleted a customer',
    entityType: 'Customer',
  })
  async deleteCustomer(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.customersService.deleteCustomer(organizationId, id);

    return {
      success: true,
      message: 'Customer deleted successfully',
    };
  }
}
