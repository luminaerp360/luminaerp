import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  create(createDepartmentDto: CreateDepartmentDto, organizationId: number) {
    return this.prisma.department.create({
      data: {
        ...createDepartmentDto,
        organizationId,
      },
    });
  }

  findAll(organizationId: number) {
    return this.prisma.department.findMany({
      where: { organizationId },
    });
  }

  findOne(id: number, organizationId: number) {
    return this.prisma.department.findFirst({
      where: { id, organizationId },
    });
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto, organizationId: number) {
    return this.prisma.department.updateMany({
      where: { id, organizationId },
      data: updateDepartmentDto,
    });
  }

  remove(id: number, organizationId: number) {
    return this.prisma.department.deleteMany({
      where: { id, organizationId },
    });
  }
}