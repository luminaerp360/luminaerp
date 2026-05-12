import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { StoreProductService } from './store-product.service';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/store-products')
export class StoreProductController {
  constructor(private readonly storeProductService: StoreProductService) {}

  @Post()
  create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() createStoreProductDto: CreateStoreProductDto,
  ) {
    return this.storeProductService.create(
      createStoreProductDto,
      organizationId,
    );
  }

  @Get()
  findAll(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.storeProductService.findAll(organizationId, {
      search,
      categoryId: categoryId ? +categoryId : undefined,
      departmentId: departmentId ? +departmentId : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      lowStock: lowStock === 'true',
    });
  }

  @Get('low-stock')
  getLowStock(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.storeProductService.getLowStockProducts(organizationId);
  }

  @Get('summary')
  getStockSummary(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.storeProductService.getStockSummary(organizationId);
  }

  @Get(':id')
  findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storeProductService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreProductDto: UpdateStoreProductDto,
  ) {
    return this.storeProductService.update(
      id,
      updateStoreProductDto,
      organizationId,
    );
  }

  @Delete(':id')
  remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storeProductService.remove(id, organizationId);
  }
}
