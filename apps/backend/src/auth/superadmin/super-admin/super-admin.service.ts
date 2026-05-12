import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  CreateSuperAdminDto,
  SuperAdminAuthDto,
  AssignUserOrganizationDto,
  BulkAssignUserOrganizationDto,
  RevokeUserOrganizationDto,
} from './dto/superAdminAuth.dto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // Get super admin permissions (all permissions)
  private getSuperAdminPermissions() {
    return {
      lpo: true,
      sales: true,
      stock: true,
      users: true,
      reports: true,
      setting: true,
      products: true,
      categories: true,
      credit_sales: true,
      customers: true,
      dashboard: true,
      inventory: true,
      quotations: true,
      suppliers: true,
      // Super admin specific permissions
      organizations: true,
      subscriptions: true,
      system_settings: true,
      all_users: true,
      all_transactions: true,
    };
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const hash = await argon.hash(dto.password);
    const permissions = this.getSuperAdminPermissions();

    try {
      // Create a default organization for super admin if none exists
      let superAdminOrg = await this.prisma.organization.findFirst({
        where: { name: 'Super Admin Organization' },
      });

      if (!superAdminOrg) {
        superAdminOrg = await this.prisma.organization.create({
          data: {
            name: 'Super Admin Organization',
            address: 'System',
            contact: 'system@admin.com',
          },
        });
      }

      const superAdmin = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          organizationId: superAdminOrg.id,
          fullName: dto.fullName,
          username: dto.username,
          role: 'SUPER_ADMIN',
          status: 'Active',
          permissions: permissions,
          createdBy: 'SYSTEM',
          phone: dto.phone || '',
        },
      });

      delete superAdmin.password;
      return this.signToken(superAdmin, superAdmin.id, superAdmin.email);
    } catch (error) {
      this.logger.error(
        `Super admin creation error: ${error.message}`,
        error.stack,
      );

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already registered.');
        }
      }
      throw new InternalServerErrorException(
        'Error occurred during super admin creation',
      );
    }
  }

  async superAdminLogin(dto: SuperAdminAuthDto) {
    // Find user with SUPER_ADMIN role (case-insensitive)
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid super admin credentials.');
    }

    // Check if user has super admin role (case-insensitive)
    const isSuperAdmin = user.role?.toLowerCase() === 'super_admin';
    if (!isSuperAdmin) {
      throw new ForbiddenException('Access denied. Super admin role required.');
    }

    const isPasswordValid = await argon.verify(user.password, dto.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid credentials.');
    }

    return this.signToken(user, user.id, user.email);
  }

  private async signToken(user: any, userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
      role: user.role,
      organizationId: user.organizationId,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '24h', // Longer session for super admin
      secret,
    });

    // Remove password from response
    delete user.password;

    return {
      access_token: token,
      email,
      user,
    };
  }

  // Function to assign permissions based on role
  private getPermissionsByRole(role: string) {
    const allPermissions = {
      lpo: true,
      sales: true,
      stock: true,
      users: true,
      reports: true,
      setting: true,
      products: true,
      categories: true,
      credit_sales: true,
      customers: true,
      dashboard: true,
      inventory: true,
      quotations: true,
      suppliers: true,
    };

    const normalizedRole = role.toLowerCase();

    if (normalizedRole === 'admin') {
      return allPermissions;
    }

    if (normalizedRole === 'manager') {
      return {
        ...allPermissions,
        users: false, // Managers might not manage users
      };
    }

    if (normalizedRole === 'sales') {
      return {
        sales: true,
        customers: true,
        credit_sales: true,
        quotations: true,
        lpo: true,
        dashboard: true,
      };
    }

    // Default user permissions
    return {
      dashboard: true,
      sales: true,
      customers: true,
    };
  }

  /**
   * Assign user to an organization with specific role
   */
  async assignUserToOrganization(dto: AssignUserOrganizationDto) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check if user's primary organization is the target organization
      if (user.organizationId === dto.organizationId) {
        throw new ForbiddenException(
          `User already belongs to ${organization.name} as their primary organization`,
        );
      }

      // Get permissions for the role
      const permissions = this.getPermissionsByRole(dto.role);

      // Create or update user organization access
      const result = await this.prisma.userOrganizationAccess.upsert({
        where: {
          userId_organizationId: {
            userId: dto.userId,
            organizationId: dto.organizationId,
          },
        },
        update: {
          isActive: true,
          role: dto.role,
          permissions,
          updatedAt: new Date(),
        },
        create: {
          userId: dto.userId,
          organizationId: dto.organizationId,
          role: dto.role,
          permissions,
          isActive: true,
        },
      });

      this.logger.log(
        `Super Admin assigned ${dto.role} access to user ${dto.userId} for organization ${dto.organizationId}`,
      );

      return {
        success: true,
        message: `Successfully assigned ${user.fullName} to ${organization.name} with ${dto.role} role`,
        assignment: {
          userId: dto.userId,
          userName: user.fullName,
          userEmail: user.email,
          organizationId: dto.organizationId,
          organizationName: organization.name,
          role: dto.role,
          permissions,
          assignedAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error assigning user ${dto.userId} to organization ${dto.organizationId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error occurred while assigning user to organization',
      );
    }
  }

  /**
   * Bulk assign multiple users to organizations
   */
  async bulkAssignUserOrganizations(dto: BulkAssignUserOrganizationDto) {
    const results = [];
    const errors = [];

    for (const assignment of dto.assignments) {
      try {
        const result = await this.assignUserToOrganization(assignment);
        results.push(result);
      } catch (error) {
        errors.push({
          assignment,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      totalAssignments: dto.assignments.length,
      successfulAssignments: results.length,
      failedAssignments: errors.length,
      results,
      errors,
    };
  }

  /**
   * Revoke user access to organization
   */
  async revokeUserOrganizationAccess(dto: RevokeUserOrganizationDto) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          organizationId: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Can't revoke access to user's primary organization
      if (user.organizationId === dto.organizationId) {
        throw new ForbiddenException(
          "Cannot revoke access to user's primary organization",
        );
      }

      // Check if user has access to revoke
      const existingAccess =
        await this.prisma.userOrganizationAccess.findUnique({
          where: {
            userId_organizationId: {
              userId: dto.userId,
              organizationId: dto.organizationId,
            },
          },
        });

      if (!existingAccess) {
        throw new NotFoundException(
          'User does not have access to this organization',
        );
      }

      // Revoke access
      await this.prisma.userOrganizationAccess.update({
        where: {
          userId_organizationId: {
            userId: dto.userId,
            organizationId: dto.organizationId,
          },
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Super Admin revoked access for user ${dto.userId} from organization ${dto.organizationId}`,
      );

      return {
        success: true,
        message: `Successfully revoked ${user.fullName}'s access to ${organization.name}`,
        revocation: {
          userId: dto.userId,
          userName: user.fullName,
          userEmail: user.email,
          organizationId: dto.organizationId,
          organizationName: organization.name,
          revokedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error revoking user ${dto.userId} access from organization ${dto.organizationId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error occurred while revoking user organization access',
      );
    }
  }

  /**
   * Get all user organization assignments (for admin overview)
   */
  async getAllUserOrganizationAssignments() {
    try {
      const assignments = await this.prisma.userOrganizationAccess.findMany({
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      });

      // Get unique user IDs and organization IDs
      const userIds = [...new Set(assignments.map((a) => a.userId))];
      const orgIds = [...new Set(assignments.map((a) => a.organizationId))];

      // Fetch users and organizations
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          fullName: true,
          email: true,
          organizationId: true,
        },
      });

      const organizations = await this.prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: {
          id: true,
          name: true,
          address: true,
        },
      });

      const primaryOrgs = await this.prisma.organization.findMany({
        where: { id: { in: [...new Set(users.map((u) => u.organizationId))] } },
        select: {
          id: true,
          name: true,
        },
      });

      // Create lookup maps
      const userMap = new Map(users.map((u) => [u.id, u]));
      const orgMap = new Map(organizations.map((o) => [o.id, o]));
      const primaryOrgMap = new Map(primaryOrgs.map((o) => [o.id, o]));

      return {
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter((a) => a.isActive).length,
        inactiveAssignments: assignments.filter((a) => !a.isActive).length,
        assignments: assignments.map((assignment) => {
          const user = userMap.get(assignment.userId);
          const organization = orgMap.get(assignment.organizationId);
          const primaryOrg = user
            ? primaryOrgMap.get(user.organizationId)
            : null;

          return {
            id: assignment.id,
            userId: assignment.userId,
            userName: user?.fullName || 'Unknown',
            userEmail: user?.email || 'Unknown',
            userPrimaryOrg: primaryOrg?.name || 'Unknown',
            organizationId: assignment.organizationId,
            organizationName: organization?.name || 'Unknown',
            organizationAddress: organization?.address || 'Unknown',
            role: assignment.role,
            permissions: assignment.permissions,
            isActive: assignment.isActive,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            lastAccessedAt: assignment.lastAccessedAt,
          };
        }),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching user organization assignments: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Error occurred while fetching user organization assignments',
      );
    }
  }

  /**
   * Get user organization assignments for specific user
   */
  async getUserOrganizationAssignments(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const assignments = await this.prisma.userOrganizationAccess.findMany({
        where: { userId },
        orderBy: [{ isActive: 'desc' }, { lastAccessedAt: 'desc' }],
      });

      // Get organization details
      const orgIds = assignments.map((a) => a.organizationId);
      const organizations = await this.prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: {
          id: true,
          name: true,
          address: true,
        },
      });

      const orgMap = new Map(organizations.map((o) => [o.id, o]));

      return {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          primaryOrganization: user.organization,
        },
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter((a) => a.isActive).length,
        assignments: assignments.map((assignment) => {
          const organization = orgMap.get(assignment.organizationId);

          return {
            organizationId: assignment.organizationId,
            organizationName: organization?.name || 'Unknown',
            organizationAddress: organization?.address || 'Unknown',
            role: assignment.role,
            permissions: assignment.permissions,
            isActive: assignment.isActive,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            lastAccessedAt: assignment.lastAccessedAt,
          };
        }),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching assignments for user ${userId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error occurred while fetching user organization assignments',
      );
    }
  }
}
