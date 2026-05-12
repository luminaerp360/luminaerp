import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(organizationId: number, dto: CategoryDto) {
    if (!dto.name) {
      throw new BadRequestException('Name is required');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        pictureUrl: dto.pictureUrl,
        organizationId, // Direct assignment since it's a required field
      },
    });
  }

  async getAllCategories(organizationId: number) {
    // Exclude internal fallback category named 'Uncategorized' from public lists
    return this.prisma.category.findMany({
      where: {
        organizationId,
        NOT: { name: 'Uncategorized' },
      },
    });
  }

  async getCategoryById(organizationId: number, id: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${id} not found in this organization`,
      );
    }

    return category;
  }

  async updateCategory(organizationId: number, id: number, dto: CategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${id} not found in this organization`,
      );
    }

    if (!dto.name) {
      throw new BadRequestException('Name is required');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description ?? '',
        pictureUrl: dto.pictureUrl,
        updatedAt: new Date(),
      },
    });
  }

  async deleteCategory(organizationId: number, id: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${id} not found in this organization`,
      );
    }

    // Reassign dependent products to an 'Uncategorized' category before deletion
    const dependentProductsCount = await this.prisma.product.count({
      where: { categoryId: id, organizationId },
    });

    if (dependentProductsCount > 0) {
      // Find or create fallback 'Uncategorized' category for this organization
      let fallback = await this.prisma.category.findFirst({
        where: { name: 'Uncategorized', organizationId },
      });

      if (!fallback) {
        fallback = await this.prisma.category.create({
          data: {
            name: 'Uncategorized',
            description: 'Default category for uncategorized products',
            organizationId,
          },
        });
      }

      // Reassign products in a single query
      await this.prisma.product.updateMany({
        where: { categoryId: id, organizationId },
        data: { categoryId: fallback.id },
      });
    }

    try {
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error: any) {
      // Log original error for diagnostics
      console.error('Error deleting category:', error?.message ?? error);

      const code = error?.code || error?.meta?.code;

      // Handle known Prisma errors
      if (code === 'P2003' || (error?.message && error.message.includes('violates RESTRICT'))) {
        throw new BadRequestException(
          'Cannot delete category: there are products or other records linked to this category. Remove dependent records first.',
        );
      }

      if (code === 'P2025') {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      throw new InternalServerErrorException('Failed to delete category');
    }
  }
}
