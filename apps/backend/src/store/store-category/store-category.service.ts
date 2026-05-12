import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoreCategoryDto } from './dto/create-store-category.dto';
import { UpdateStoreCategoryDto } from './dto/update-store-category.dto';

@Injectable()
export class StoreCategoryService {
  constructor(private prisma: PrismaService) {}

  create(createStoreCategoryDto: CreateStoreCategoryDto, organizationId: number) {
    return this.prisma.storeCategory.create({
      data: {
        ...createStoreCategoryDto,
        organizationId,
      },
    });
  }

  findAll(organizationId: number) {
    return this.prisma.storeCategory.findMany({
      where: { organizationId },
    });
  }

  findOne(id: number, organizationId: number) {
    return this.prisma.storeCategory.findFirst({
      where: { id, organizationId },
    });
  }

  update(id: number, updateStoreCategoryDto: UpdateStoreCategoryDto, organizationId: number) {
    return this.prisma.storeCategory.updateMany({
      where: { id, organizationId },
      data: updateStoreCategoryDto,
    });
  }

  remove(id: number, organizationId: number) {
    return this.prisma.storeCategory.deleteMany({
      where: { id, organizationId },
    });
  }
}