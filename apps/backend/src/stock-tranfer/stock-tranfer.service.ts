import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockTransferStatus } from '@prisma/client';
import {
  CreateStockTransferDto,
  UpdateStockTransferStatusDto,
} from './dto/stock-transfer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockTransferService {
  constructor(private prisma: PrismaService) {}

  private generateTransferNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ST-${timestamp}-${random}`;
  }

  async create(
    createStockTransferDto: CreateStockTransferDto,
    userId: number,
    userName: string,
  ) {
    const {
      fromOrganizationId,
      toOrganizationId,
      items,
      fromLocationId,
      toLocationId,
    } = createStockTransferDto;

    // Validate that organizations are different
    if (fromOrganizationId === toOrganizationId) {
      throw new BadRequestException(
        'Cannot transfer stock within the same organization',
      );
    }

    // Verify user has access to source organization
    console.log(
      `🔍 Checking source organization access for user ${userId} to organization ${fromOrganizationId}`,
    );

    // First, let's see all user access records for debugging
    const allUserAccess = await this.prisma.userOrganizationAccess.findMany({
      where: { userId },
    });
    console.log(
      '📋 All user access records for user:',
      JSON.stringify(allUserAccess, null, 2),
    );

    // Check specific access to source organization
    const userAccess = await this.prisma.userOrganizationAccess.findFirst({
      where: {
        userId,
        organizationId: fromOrganizationId,
        isActive: true,
      },
    });
    console.log(
      '🎯 Source org access check result:',
      JSON.stringify(userAccess, null, 2),
    );

    // Also check if user's primary organization is the source
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        fullName: true,
        role: true,
      },
    });
    console.log('👤 User details:', JSON.stringify(user, null, 2));

    // Allow if user has explicit access OR if source is their primary organization
    const hasExplicitAccess = !!userAccess;
    const isPrimaryOrg = user?.organizationId === fromOrganizationId;

    console.log(`✅ Has explicit access to source org: ${hasExplicitAccess}`);
    console.log(`🏠 Source is primary org: ${isPrimaryOrg}`);
    console.log(
      `📊 Source org ID: ${fromOrganizationId}, User primary org ID: ${user?.organizationId}`,
    );

    if (!hasExplicitAccess && !isPrimaryOrg) {
      console.log(
        `❌ Access denied: User ${userId} cannot create transfer from org ${fromOrganizationId}`,
      );
      throw new ForbiddenException(
        `You do not have access to the source organization. User ${userId} needs access to organization ${fromOrganizationId}`,
      );
    }

    console.log(
      `✅ Access granted: User ${userId} can create transfer from org ${fromOrganizationId}`,
    );

    // Validate that organizations are different (add this check here)
    console.log(
      `📊 Transfer request: FROM org ${fromOrganizationId} TO org ${toOrganizationId}`,
    );

    if (fromOrganizationId === toOrganizationId) {
      throw new BadRequestException(
        'Cannot transfer stock within the same organization',
      );
    }

    // Ensure IDs are numbers (convert if necessary)
    const fromOrgId = Number(fromOrganizationId);
    const toOrgId = Number(toOrganizationId);

    // Convert empty/falsy values to null for location IDs
    const fromLocationIdValue = fromLocationId || null;
    const toLocationIdValue = toLocationId || null;

    console.log(`🔢 Converted IDs: FROM org ${fromOrgId} TO org ${toOrgId}`);
    console.log(
      `📍 Location IDs: FROM ${fromLocationIdValue}, TO ${toLocationIdValue}`,
    ); // Verify both organizations exist
    console.log('🔍 Checking if organizations exist...');
    const [fromOrg, toOrg] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: fromOrgId },
      }),
      this.prisma.organization.findUnique({ where: { id: toOrgId } }),
    ]);

    console.log('🏢 From organization:', fromOrg ? fromOrg.name : 'NOT FOUND');
    console.log('🏢 To organization:', toOrg ? toOrg.name : 'NOT FOUND');

    if (!fromOrg || !toOrg) {
      throw new NotFoundException('One or both organizations not found');
    }

    // Verify locations exist and belong to correct organizations
    if (fromLocationId) {
      console.log(
        `🔍 Checking from location ${fromLocationId} in org ${fromOrgId}`,
      );
      const fromLocation = await this.prisma.location.findFirst({
        where: { id: fromLocationId, organizationId: fromOrgId },
      });
      if (!fromLocation) {
        throw new BadRequestException(
          'Source location does not belong to source organization',
        );
      }
    }

    if (toLocationId) {
      console.log(`🔍 Checking to location ${toLocationId} in org ${toOrgId}`);
      const toLocation = await this.prisma.location.findFirst({
        where: { id: toLocationId, organizationId: toOrgId },
      });
      if (!toLocation) {
        throw new BadRequestException(
          'Destination location does not belong to destination organization',
        );
      }
    }

    // Verify product availability
    console.log('🔍 Checking product availability...');
    for (const item of items) {
      console.log(
        `📦 Checking product ${item.productIdNumber} (${item.productName})`,
      );
      const product = await this.prisma.product.findFirst({
        where: {
          productIdNumber: item.productIdNumber,
          organizationId: fromOrgId,
          ...(fromLocationIdValue && { locationId: fromLocationIdValue }),
        },
      });

      console.log(
        `📦 Product found:`,
        product ? `${product.name} (Qty: ${product.quantity})` : 'NOT FOUND',
      );

      if (!product) {
        throw new NotFoundException(
          `Product ${item.productName} not found in source organization/location`,
        );
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        );
      }
    }

    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    console.log(`💰 Total transfer value: ${totalValue}`);

    // Create the transfer record
    console.log('📝 Creating transfer record...');
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNumber: this.generateTransferNumber(),
        fromOrganizationId: fromOrgId,
        toOrganizationId: toOrgId,
        fromLocationId: fromLocationIdValue,
        toLocationId: toLocationIdValue,
        items: JSON.stringify(items),
        totalValue,
        transferredBy: userId,
        transferredByName: userName,
        notes: createStockTransferDto.notes,
      },
      include: {
        fromOrganization: { select: { name: true } },
        toOrganization: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    });

    console.log(`✅ Transfer created successfully: ${transfer.transferNumber}`);

    return {
      success: true,
      message: 'Stock transfer request created successfully',
      transfer,
    };
  }

  async findAll(userId: number, organizationId?: number, query?: any) {
    // Pagination and filter defaults
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const pageSize =
      Number(query?.pageSize) > 0 ? Math.min(Number(query.pageSize), 200) : 20;
    const skip = (page - 1) * pageSize;

    const { startDate, endDate, search, status } = query || {};

    // Get accessible organizations (existing logic)
    const userOrgs = await this.prisma.userOrganizationAccess.findMany({
      where: { userId, isActive: true },
      select: { organizationId: true },
    });
    const accessibleOrgIds = userOrgs.map((ua) => ua.organizationId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    const allAccessibleOrgs = [...accessibleOrgIds];
    if (
      user?.organizationId &&
      !allAccessibleOrgs.includes(user.organizationId)
    ) {
      allAccessibleOrgs.push(user.organizationId);
    }

    // Base where clause for org access
    const whereClause: Prisma.StockTransferWhereInput = {
      OR: [
        { fromOrganizationId: { in: allAccessibleOrgs } },
        { toOrganizationId: { in: allAccessibleOrgs } },
      ],
    };

    // Filter by specific organization if provided
    if (organizationId) {
      whereClause.OR = [
        { fromOrganizationId: organizationId },
        { toOrganizationId: organizationId },
      ];
    }

    // Date range filtering
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          (whereClause.createdAt as any).gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // Include entire end day by setting to 23:59:59.999
          end.setHours(23, 59, 59, 999);
          (whereClause.createdAt as any).lte = end;
        }
      }
    }

    // Status filter (can be single or comma separated)
    if (status) {
      const statuses = String(status)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (statuses.length === 1) {
        (whereClause as any).status = statuses[0] as any;
      } else if (statuses.length > 1) {
        (whereClause as any).status = { in: statuses as any };
      }
    }

    // Search filter across several text fields (transferNumber, names, notes)
    if (search) {
      const s = String(search).trim();
      if (s.length > 0) {
        // We'll use OR for search fields
        (whereClause as any).AND = [
          {
            OR: [
              { transferNumber: { contains: s, mode: 'insensitive' } },
              { transferredByName: { contains: s, mode: 'insensitive' } },
              { approvedByName: { contains: s, mode: 'insensitive' } },
              { notes: { contains: s, mode: 'insensitive' } },
              { rejectionReason: { contains: s, mode: 'insensitive' } },
            ],
          },
        ];
      }
    }

    // Count total first
    const total = await this.prisma.stockTransfer.count({ where: whereClause });

    const transfers = await this.prisma.stockTransfer.findMany({
      where: whereClause,
      include: {
        fromOrganization: { select: { name: true } },
        toOrganization: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      data: transfers,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        hasNextPage: skip + pageSize < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: number, userId: number) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromOrganization: { select: { name: true } },
        toOrganization: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    // Verify user has access to at least one of the organizations
    const userAccess = await this.prisma.userOrganizationAccess.findFirst({
      where: {
        userId,
        organizationId: {
          in: [transfer.fromOrganizationId, transfer.toOrganizationId],
        },
        isActive: true,
      },
    });

    if (!userAccess) {
      throw new ForbiddenException('You do not have access to this transfer');
    }

    return {
      ...transfer,
      items: JSON.parse(transfer.items as string),
    };
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStockTransferStatusDto,
    userId: number,
    userName: string,
  ) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromOrganization: true,
        toOrganization: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    // Verify user has access to destination organization (for approval)
    if (updateStatusDto.status === StockTransferStatus.APPROVED) {
      console.log(
        `🔍 Checking approval access for user ${userId} to organization ${transfer.toOrganizationId}`,
      );

      // First, let's see all user access records for debugging
      const allUserAccess = await this.prisma.userOrganizationAccess.findMany({
        where: { userId },
      });
      console.log(
        '📋 All user access records:',
        JSON.stringify(allUserAccess, null, 2),
      );

      // Check specific access to destination organization
      const userAccess = await this.prisma.userOrganizationAccess.findFirst({
        where: {
          userId,
          organizationId: transfer.toOrganizationId,
          isActive: true,
        },
      });
      console.log(
        '🎯 Destination org access:',
        JSON.stringify(userAccess, null, 2),
      );

      // Also check if user's primary organization is the destination
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true, email: true, fullName: true },
      });
      console.log('👤 User details:', JSON.stringify(user, null, 2));

      // Allow if user has explicit access OR if destination is their primary organization
      const hasExplicitAccess = !!userAccess;
      const isPrimaryOrg = user?.organizationId === transfer.toOrganizationId;

      console.log(`✅ Has explicit access: ${hasExplicitAccess}`);
      console.log(`🏠 Is primary org: ${isPrimaryOrg}`);

      if (!hasExplicitAccess && !isPrimaryOrg) {
        console.log(
          `❌ Access denied: User ${userId} cannot approve transfer to org ${transfer.toOrganizationId}`,
        );
        throw new ForbiddenException(
          `Only destination organization users can approve transfers. User ${userId} needs access to organization ${transfer.toOrganizationId}`,
        );
      }

      console.log(
        `✅ Access granted: User ${userId} can approve transfer to org ${transfer.toOrganizationId}`,
      );
    }

    // Handle status-specific logic
    let updateData: any = {
      status: updateStatusDto.status,
      notes: updateStatusDto.notes,
      updatedAt: new Date(),
    };

    if (updateStatusDto.status === StockTransferStatus.APPROVED) {
      updateData.approvedBy = userId;
      updateData.approvedByName = userName;
      updateData.approvedAt = new Date();

      // Execute the actual stock transfer immediately upon approval
      console.log('🔄 Executing stock transfer upon approval...');
      await this.executeStockTransfer(transfer);

      // Mark as completed since we executed the transfer
      updateData.status = StockTransferStatus.COMPLETED;
      updateData.completedAt = new Date();

      console.log('✅ Stock transfer executed and completed successfully');
    }

    if (updateStatusDto.status === StockTransferStatus.REJECTED) {
      updateData.rejectionReason = updateStatusDto.rejectionReason;
    }

    if (updateStatusDto.status === StockTransferStatus.COMPLETED) {
      // Execute the actual stock transfer
      await this.executeStockTransfer(transfer);
      updateData.completedAt = new Date();
    }

    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: updateData,
      include: {
        fromOrganization: { select: { name: true } },
        toOrganization: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    });

    return {
      success: true,
      message: `Transfer ${updateStatusDto.status.toLowerCase()} successfully`,
      transfer: updatedTransfer,
    };
  }

  private async executeStockTransfer(transfer: any) {
    const items = JSON.parse(transfer.items as string);

    await this.prisma.$transaction(async (prisma) => {
      for (const item of items) {
        // Reduce stock from source
        const sourceProduct = await prisma.product.findFirst({
          where: {
            productIdNumber: item.productIdNumber,
            organizationId: transfer.fromOrganizationId,
            ...(transfer.fromLocationId && {
              locationId: transfer.fromLocationId,
            }),
          },
        });

        if (!sourceProduct) {
          throw new BadRequestException(
            `Source product ${item.productName} not found`,
          );
        }

        if (sourceProduct.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.productName}`,
          );
        }

        // Update source product quantity
        await prisma.product.update({
          where: { id: sourceProduct.id },
          data: { quantity: sourceProduct.quantity - item.quantity },
        });

        // Check if product exists in destination
        const existingDestProduct = await prisma.product.findFirst({
          where: {
            productIdNumber: item.productIdNumber,
            organizationId: transfer.toOrganizationId,
            ...(transfer.toLocationId && { locationId: transfer.toLocationId }),
          },
        });

        if (existingDestProduct) {
          // Update existing product quantity
          await prisma.product.update({
            where: { id: existingDestProduct.id },
            data: { quantity: existingDestProduct.quantity + item.quantity },
          });
        } else {
          // Create new product in destination
          // You'll need to get category info and other required fields
          const sourceProductDetails = await prisma.product.findFirst({
            where: {
              productIdNumber: item.productIdNumber,
              organizationId: transfer.fromOrganizationId,
            },
            select: {
              name: true,
              description: true,
              pictureUrl: true,
              productIdNumber: true,
              reorderLevel: true,
              availability: true,
              countable: true,
              isService: true,
              price: true,
              buyingPrice: true,
              expiryDate: true,
              categoryId: true,
            },
          });

          if (sourceProductDetails) {
            // Find or create category in destination organization
            const destCategory = await prisma.category.findFirst({
              where: {
                name: 'Transferred Items', // Default category for transferred items
                organizationId: transfer.toOrganizationId,
              },
            });

            let categoryId = destCategory?.id;
            if (!categoryId) {
              const newCategory = await prisma.category.create({
                data: {
                  name: 'Transferred Items',
                  description: 'Items received from stock transfers',
                  organizationId: transfer.toOrganizationId,
                },
              });
              categoryId = newCategory.id;
            }

            await prisma.product.create({
              data: {
                ...sourceProductDetails,
                organizationId: transfer.toOrganizationId,
                locationId: transfer.toLocationId,
                quantity: item.quantity,
                categoryId,
                productIdNumber: sourceProductDetails.productIdNumber, // Keep same productIdNumber
              },
            });
          }
        }
      }
    });
  }

  async cancel(id: number, userId: number) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    if (transfer.transferredBy !== userId) {
      throw new ForbiddenException('Only the transfer creator can cancel it');
    }

    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be cancelled');
    }

    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.CANCELLED },
    });

    return {
      success: true,
      message: 'Transfer cancelled successfully',
      transfer: updatedTransfer,
    };
  }

  async getTransferStats(organizationId: number, userId: number) {
    // Verify user access
    const userAccess = await this.prisma.userOrganizationAccess.findFirst({
      where: { userId, organizationId, isActive: true },
    });

    if (!userAccess) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const [outgoing, incoming, totalValue] = await Promise.all([
      this.prisma.stockTransfer.count({
        where: { fromOrganizationId: organizationId },
      }),
      this.prisma.stockTransfer.count({
        where: { toOrganizationId: organizationId },
      }),
      this.prisma.stockTransfer.aggregate({
        where: {
          OR: [
            { fromOrganizationId: organizationId },
            { toOrganizationId: organizationId },
          ],
          status: StockTransferStatus.COMPLETED,
        },
        _sum: { totalValue: true },
      }),
    ]);

    return {
      outgoingTransfers: outgoing,
      incomingTransfers: incoming,
      totalTransferValue: totalValue._sum.totalValue || 0,
    };
  }
}
