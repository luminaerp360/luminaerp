import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customerDto.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(organizationId: number, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        dueCredit: dto.dueCredit || 0,
        isActive: dto.isActive ?? true,
        email: dto.email,
        customerType: dto.customerType || 'INDIVIDUAL',
        kraPin: dto.kraPin || null,
        organizationId,
      },
    });
  }

  async getAllCustomers(organizationId: number) {
    return this.prisma.customer.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }, // Add ordering for consistency
    });
  }

  async getCustomerById(organizationId: number, id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found in this organization`,
      );
    }

    return customer;
  }

  async updateCustomer(
    organizationId: number,
    id: number,
    dto: UpdateCustomerDto,
  ) {
    // First check if customer exists
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingCustomer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found in this organization`,
      );
    }

    // Build update data object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are actually provided in the DTO
    if (dto.fullName !== undefined) {
      updateData.fullName = dto.fullName;
    }
    if (dto.phoneNumber !== undefined) {
      updateData.phoneNumber = dto.phoneNumber;
    }
    if (dto.email !== undefined) {
      updateData.email = dto.email;
    }
    if (dto.dueCredit !== undefined) {
      updateData.dueCredit = dto.dueCredit;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }
    if (dto.customerType !== undefined) {
      updateData.customerType = dto.customerType;
    }
    if (dto.kraPin !== undefined) {
      updateData.kraPin = dto.kraPin || null;
    }

    // Perform the update
    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    console.log('updated customer dto', UpdateCustomerDto);
    console.log('updated customer', updatedCustomer);

    return updatedCustomer;
  }

  async deleteCustomer(organizationId: number, id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found in this organization`,
      );
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  // Additional methods for customer management
  async getCustomersByDueCredit(organizationId: number, minDueCredit: number) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        dueCredit: {
          gte: minDueCredit,
        },
      },
      orderBy: {
        dueCredit: 'desc',
      },
    });
  }

  async getActiveCustomers(organizationId: number) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });
  }
}
