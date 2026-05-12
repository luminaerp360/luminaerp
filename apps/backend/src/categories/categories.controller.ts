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
import { CategoryService } from './categories.service';
import { CategoryDto } from './category.dto';
import { JwtGuard } from 'src/auth/guard';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('organizations/:organizationId/categories')
@UseGuards(JwtGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.CATEGORIES,
    description: 'Created a new category',
    entityType: 'Category',
  })
  async createCategory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CategoryDto,
  ) {
    return this.categoryService.createCategory(organizationId, dto);
  }

  @Get()
  async getAllCategories(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.categoryService.getAllCategories(organizationId);
  }

  @Get(':id')
  async getCategoryById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoryService.getCategoryById(organizationId, id);
  }

  @Put(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.CATEGORIES,
    description: 'Updated category details',
    entityType: 'Category',
  })
  async updateCategory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CategoryDto,
  ) {
    return this.categoryService.updateCategory(organizationId, id, dto);
  }

  @Delete(':id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.CATEGORIES,
    description: 'Deleted a category',
    entityType: 'Category',
  })
  async deleteCategory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoryService.deleteCategory(organizationId, id);
  }
}
