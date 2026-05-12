import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupplierDto } from './suppliersDto.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async createSupplier(organizationId: number, dto: SupplierDto) {
    // Check if phone number already exists for this organization
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
      },
    });

    if (existingSupplier) {
      throw new ConflictException(
        'A supplier with this phone number already exists in this organization'
      );
    }

    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        totalUnpaidSuppliers: dto.totalUnpaidSuppliers || 0,
        deleted: dto.deleted || false,
        organizationId,
      },
    });
  }

  async getAllSuppliers(organizationId: number) {
    return this.prisma.supplier.findMany({
      where: {
        organizationId,
        deleted: false,
      },
      include: {
        LocalPurchaseOrder: true,
        Inventory: true,
      },
    });
  }

  async getSupplierById(organizationId: number, id: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        organizationId,
        deleted: false,
      },
      include: {
        LocalPurchaseOrder: true,
        Inventory: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Supplier with ID ${id} not found in this organization`
      );
    }

    return supplier;
  }

  async updateSupplier(organizationId: number, id: number, dto: SupplierDto) {
    // First check if supplier exists
    await this.getSupplierById(organizationId, id);

    // Check if phone number is being changed and if it conflicts
    if (dto.phone) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: {
          organizationId,
          phone: dto.phone,
          id: { not: id }, // Exclude current supplier
        },
      });

      if (existingSupplier) {
        throw new ConflictException(
          'A supplier with this phone number already exists in this organization'
        );
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        totalUnpaidSuppliers: dto.totalUnpaidSuppliers,
        deleted: dto.deleted,
      },
    });
  }

  async deleteSupplier(organizationId: number, id: number) {
    // First check if supplier exists
    await this.getSupplierById(organizationId, id);

    // Soft delete by setting deleted flag
    return this.prisma.supplier.update({
      where: { id },
      data: {
        deleted: true,
      },
    });
  }
}