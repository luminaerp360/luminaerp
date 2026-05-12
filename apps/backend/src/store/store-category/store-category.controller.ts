import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { StoreCategoryService } from './store-category.service';
import { CreateStoreCategoryDto } from './dto/create-store-category.dto';
import { UpdateStoreCategoryDto } from './dto/update-store-category.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/store-categories')
export class StoreCategoryController {
  constructor(private readonly storeCategoryService: StoreCategoryService) {}

  @Post()
  create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() createStoreCategoryDto: CreateStoreCategoryDto,
  ) {
    return this.storeCategoryService.create(createStoreCategoryDto, organizationId);
  }

  @Get()
  findAll(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.storeCategoryService.findAll(organizationId);
  }

  @Get(':id')
  findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storeCategoryService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreCategoryDto: UpdateStoreCategoryDto,
  ) {
    return this.storeCategoryService.update(id, updateStoreCategoryDto, organizationId);
  }

  @Delete(':id')
  remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storeCategoryService.remove(id, organizationId);
  }
}