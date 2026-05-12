import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentService.create(createDepartmentDto, organizationId);
  }

  @Get()
  findAll(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.departmentService.findAll(organizationId);
  }

  @Get(':id')
  findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.departmentService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, updateDepartmentDto, organizationId);
  }

  @Delete(':id')
  remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.departmentService.remove(id, organizationId);
  }
}