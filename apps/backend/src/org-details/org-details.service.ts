import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrgDetailsDto, UpdateOrgDetailsDto } from './orgDetails.dto';

@Injectable()
export class OrgDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  // async create(dto: CreateOrgDetailsDto) {
  //   return this.prisma.organizationDetails.create({
  //     data: dto,
  //   });
  // }

  // async findAll() {
  //   return this.prisma.organizationDetails.findMany();
  // }

  // async findOne(id: number) {
  //   const orgDetails = await this.prisma.organizationDetails.findUnique({
  //     where: { id },
  //   });
  //   if (!orgDetails) {
  //     throw new NotFoundException(
  //       `Organization details with ID ${id} not found`,
  //     );
  //   }
  //   return orgDetails;
  // }

  // async update(id: number, dto: UpdateOrgDetailsDto) {
  //   await this.findOne(id);
  //   return this.prisma.organizationDetails.update({
  //     where: { id },
  //     data: dto,
  //   });
  // }

  // async remove(id: number) {
  //   await this.findOne(id);
  //   return this.prisma.organizationDetails.delete({
  //     where: { id },
  //   });
  // }
}
