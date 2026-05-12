// src/auth/auth.service.ts
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private settingsService: SettingsService,
  ) {}

  // Get authentication settings for an organization
  private async getAuthSettings(organizationId: number) {
    try {
      const settings =
        await this.settingsService.getByOrganization(organizationId);
      return {
        jwtAccessTokenExpiry: settings.jwtAccessTokenExpiry || '24h',
        jwtRefreshTokenExpiry: settings.jwtRefreshTokenExpiry || '7d',
        sessionTimeout: settings.sessionTimeout || 3600,
        maxLoginAttempts: settings.maxLoginAttempts || 5,
        lockoutDuration: settings.lockoutDuration || 900,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to load auth settings for org ${organizationId}, using defaults`,
      );
      return {
        jwtAccessTokenExpiry: '24h',
        jwtRefreshTokenExpiry: '7d',
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900,
      };
    }
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
      // CRUD operation permissions
      canDelete: true,
      canUpdate: true,
      canCreate: true,
      canView: true,
    };

    // Super admin permissions (includes everything plus system-wide access)
    const superAdminPermissions = {
      ...allPermissions,
      organizations: true,
      subscriptions: true,
      system_settings: true,
      all_users: true,
      all_transactions: true,
    };

    // Normalize role to lowercase for case-insensitive comparison
    const normalizedRole = role.toLowerCase();

    // If super admin, give all permissions including system-wide
    if (normalizedRole === 'super_admin') {
      return superAdminPermissions;
    }

    // If admin, give all permissions
    if (normalizedRole === 'admin') {
      return allPermissions;
    }

    // If sales role, give only sales-related permissions
    if (normalizedRole === 'sales') {
      return {
        sales: true,
        customers: true,
        credit_sales: true,
        quotations: true,
        lpo: true,
        dashboard: true, // Usually sales users need dashboard access
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false, // Sales users typically cannot delete
      };
    }

    // For other roles, return empty permissions (or you can define other role types)
    return {};
  }

  async signUp(organizationId: number, dto: AuthDto) {
    const hash = await argon.hash(dto.password);

    // Assign permissions based on role if not explicitly provided
    const permissions = this.getPermissionsByRole(dto.role);

    try {
      // Create user with organization relation and role-based permissions
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          organization: {
            connect: {
              id: organizationId,
            },
          },
          fullName: dto.fullName,
          username: dto.username,
          role: dto.role,
          phone: dto.phone,
          photoURL: dto.photoURL,
          status: dto.status,
          createdBy: dto.createdBy,
          permissions: permissions,
        },
      });

      delete user.password;
      return this.signToken(user, user.id, user.email);
    } catch (error) {
      this.logger.error(
        `Sign-up error for organization ID ${organizationId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already registered.');
        }
      }
      throw new InternalServerErrorException('Error occurred during sign-up');
    }
  }

  // OPTIMIZED: Smart login that remembers last organization
  async signInWithLastOrganization(dto: AuthDto) {
    // Single query to get user with organization
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            address: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Invalid credentials.');

    const isPasswordValid = await argon.verify(user.password, dto.password);
    if (!isPasswordValid) throw new ForbiddenException('Invalid credentials.');

    // Block login if email is not verified (only for email-registered users)
    if (!user.isEmailVerified && user.authProvider === 'email') {
      throw new ForbiddenException(
        'Please verify your email address before logging in. Check your inbox for the verification link.',
      );
    }

    // Get additional organizations access in a single query
    const additionalAccess = await this.prisma.userOrganizationAccess.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    // Get organization details for additional orgs in one query
    const additionalOrgIds = additionalAccess.map(
      (access) => access.organizationId,
    );
    const additionalOrgs =
      additionalOrgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: additionalOrgIds } },
            select: {
              id: true,
              name: true,
              logoUrl: true,
              address: true,
            },
          })
        : [];

    // Create lookup map for organizations
    const orgMap = new Map(additionalOrgs.map((org) => [org.id, org]));

    // Build organizations list efficiently
    const allOrganizations = [
      {
        id: user.organization.id,
        name: user.organization.name,
        logoUrl: user.organization.logoUrl,
        address: user.organization.address,
        role: user.role,
        permissions: user.permissions,
        isPrimary: true,
        hasAccess: true,
        lastAccessedAt: null,
      },
      ...additionalAccess.map((access) => {
        const org = orgMap.get(access.organizationId);
        return {
          id: access.organizationId,
          name: org?.name || 'Unknown',
          logoUrl: org?.logoUrl || '',
          address: org?.address || '',
          role: access.role,
          permissions: access.permissions,
          isPrimary: false,
          hasAccess: true,
          lastAccessedAt: access.lastAccessedAt,
        };
      }),
    ];

    if (allOrganizations.length === 0) {
      throw new ForbiddenException('No accessible organizations found.');
    }

    // If only one organization, login directly
    if (allOrganizations.length === 1) {
      const targetOrg = allOrganizations[0];
      return this.directSignIn(user, targetOrg, dto.email);
    }

    // Multiple organizations - find preferred (most recently accessed or primary)
    let preferredOrg = null;

    // First, check if there's a recently accessed additional org
    if (additionalAccess.length > 0 && additionalAccess[0].lastAccessedAt) {
      preferredOrg = allOrganizations.find(
        (org) => org.id === additionalAccess[0].organizationId,
      );
    }

    // If no recent access, use primary organization
    if (!preferredOrg) {
      preferredOrg = allOrganizations.find((org) => org.isPrimary);
    }

    // Login to preferred organization if found
    if (preferredOrg) {
      try {
        const result = await this.directSignIn(user, preferredOrg, dto.email);

        // Update last accessed time asynchronously (don't block response)
        if (!preferredOrg.isPrimary) {
          this.updateLastAccessedOrganization(user.id, preferredOrg.id).catch(
            (error) =>
              this.logger.warn('Failed to update last accessed:', error),
          );
        }

        return result;
      } catch (error) {
        this.logger.warn(
          `Failed to login to preferred org ${preferredOrg.id}, falling back to selection`,
        );
      }
    }

    // Return organizations for selection
    return {
      requiresOrganizationSelection: true,
      availableOrganizations: allOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        logoUrl: org.logoUrl,
        isPrimary: org.isPrimary,
        role: org.role,
        address: org.address,
      })),
      preferredOrganizationId: preferredOrg?.id || null,
      userEmail: dto.email,
    };
  }

  // NEW: Direct sign-in without additional validation queries
  private async directSignIn(user: any, organization: any, email: string) {
    // Get auth settings for this organization
    const authSettings = await this.getAuthSettings(organization.id);

    // Check trial/subscription status
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: organization.id },
      select: { status: true, endDate: true, plan: true },
    });

    if (subscription?.status === 'TRIAL' && subscription.endDate < new Date()) {
      // Auto-expire the trial
      await this.prisma.subscription.updateMany({
        where: { organizationId: organization.id, status: 'TRIAL' },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException(
        'Your free trial has expired. Please contact support to activate your subscription.',
      );
    }

    const trialDaysRemaining =
      subscription?.status === 'TRIAL'
        ? Math.max(
            0,
            Math.ceil(
              (subscription.endDate.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : null;

    // Create user object with organization context
    const userWithOrgContext = {
      ...user,
      role: organization.role,
      permissions: organization.permissions,
      currentOrganizationId: organization.id,
      isPrimaryOrg: organization.isPrimary,
    };

    // Generate token
    const payload = {
      sub: user.id,
      email,
      organizationId: organization.id,
      role: organization.role,
      subscriptionStatus: subscription?.status,
      ...(subscription?.status === 'TRIAL' && {
        trialExpiresAt: subscription.endDate,
      }),
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: authSettings.jwtAccessTokenExpiry,
      secret,
    });

    // Remove password from response
    delete userWithOrgContext.password;

    return {
      access_token: token,
      email,
      user: {
        ...userWithOrgContext,
        currentOrganizationId: organization.id,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            plan: subscription.plan,
            endDate: subscription.endDate,
            ...(trialDaysRemaining !== null && { trialDaysRemaining }),
          }
        : undefined,
    };
  }

  // UPDATED: Original signIn method with organization context
  async signIn(organizationId: number, dto: AuthDto) {
    // First, find the user by email (regardless of organization)
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Invalid credentials.');

    const isPasswordValid = await argon.verify(user.password, dto.password);
    if (!isPasswordValid) throw new ForbiddenException('Invalid credentials.');

    // Check if user has access to the requested organization
    const hasAccess = await this.hasOrganizationAccess(user.id, organizationId);

    if (!hasAccess) {
      throw new ForbiddenException(
        `You don't have access to this organization. You belong to: ${user.organization.name}`,
      );
    }

    // Get user's role and permissions for the specific organization
    const roleInfo = await this.getUserRoleInOrganization(
      user.id,
      organizationId,
    );

    if (!roleInfo) {
      throw new ForbiddenException('Access denied to this organization.');
    }

    // Create a user object with organization-specific role and permissions
    const userWithOrgContext = {
      ...user,
      role: roleInfo.role,
      permissions: roleInfo.permissions,
      currentOrganizationId: organizationId,
      isPrimaryOrg: roleInfo.isPrimary,
    };

    return this.signToken(userWithOrgContext, user.id, user.email);
  }

  // NEW: Login to specific organization with memory
  async signInToSpecificOrganization(
    organizationId: number,
    dto: AuthDto,
    rememberOrganization: boolean = true,
  ) {
    const result = await this.signIn(organizationId, dto);

    if (result.access_token && rememberOrganization) {
      // Update last accessed time asynchronously (don't block response)
      const userId = result.user.id;
      this.updateLastAccessedOrganization(userId, organizationId).catch(
        (error) => this.logger.warn('Failed to update last accessed:', error),
      );
    }

    return result;
  }

  // OPTIMIZED: Fast organization-specific login
  async fastSignInToOrganization(organizationId: number, dto: AuthDto) {
    // Get user and check access in minimal queries
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
        permissions: true,
        organizationId: true,
      },
    });

    if (!user) throw new NotFoundException('Invalid credentials.');

    const isPasswordValid = await argon.verify(user.password, dto.password);
    if (!isPasswordValid) throw new ForbiddenException('Invalid credentials.');

    // Quick access check
    let userRole = user.role;
    let userPermissions = user.permissions;
    let isPrimary = false;

    if (user.organizationId === organizationId) {
      // Primary organization - use user's role and permissions
      isPrimary = true;
    } else {
      // Check additional access
      const access = await this.prisma.userOrganizationAccess.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId,
          },
        },
        select: {
          role: true,
          permissions: true,
          isActive: true,
        },
      });

      if (!access?.isActive) {
        throw new ForbiddenException('Access denied to this organization.');
      }

      userRole = access.role;
      userPermissions = access.permissions;
    }

    // Get auth settings for this organization
    const authSettings = await this.getAuthSettings(organizationId);

    // Generate token directly
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role: userRole,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: authSettings.jwtAccessTokenExpiry,
      secret,
    });

    // Update last accessed asynchronously if not primary
    if (!isPrimary) {
      this.updateLastAccessedOrganization(user.id, organizationId).catch(
        (error) => this.logger.warn('Failed to update last accessed:', error),
      );
    }

    return {
      access_token: token,
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: userRole,
        permissions: userPermissions,
        currentOrganizationId: organizationId,
        isPrimaryOrg: isPrimary,
      },
    };
  }

  // NEW: Update last accessed organization timestamp
  private async updateLastAccessedOrganization(
    userId: number,
    organizationId: number,
  ) {
    try {
      // Check if this is additional organization access
      const access = await this.prisma.userOrganizationAccess.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (access) {
        // Update last accessed time for additional organization
        await this.prisma.userOrganizationAccess.update({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
          data: {
            lastAccessedAt: new Date(),
          },
        });

        this.logger.debug(
          `Updated last accessed time for user ${userId} in org ${organizationId}`,
        );
      }
      // Note: For primary organization, we could add a lastLoginAt field to User model if needed
    } catch (error) {
      // Don't fail login if this update fails
      this.logger.error('Error updating last accessed organization:', error);
    }
  }

  // NEW: Get user's preferred login organization based on last access
  async getPreferredLoginOrganization(userId: number): Promise<number | null> {
    try {
      const userOrganizations = await this.getUserOrganizations(userId);

      if (userOrganizations.length === 0) {
        return null;
      }

      if (userOrganizations.length === 1) {
        return userOrganizations[0].id;
      }

      // Find the most recently accessed non-primary organization
      const additionalAccess =
        await this.prisma.userOrganizationAccess.findMany({
          where: {
            userId,
            isActive: true,
          },
          orderBy: {
            lastAccessedAt: 'desc',
          },
          take: 1,
        });

      if (additionalAccess.length > 0 && additionalAccess[0].lastAccessedAt) {
        const mostRecent = additionalAccess[0];
        this.logger.debug(
          `Found last accessed org ${mostRecent.organizationId} for user ${userId}`,
        );
        return mostRecent.organizationId;
      }

      // Fallback to primary organization
      const primaryOrg = userOrganizations.find((org) => org.isPrimary);
      return primaryOrg ? primaryOrg.id : userOrganizations[0].id;
    } catch (error) {
      this.logger.error('Error getting preferred organization:', error);
      return null;
    }
  }

  // UPDATED: Enhanced signToken method with organization context
  private async signToken(user: any, userId: number, email: string) {
    const organizationId =
      user.currentOrganizationId || user.organizationId || 0;

    // Get auth settings for this organization
    const authSettings = await this.getAuthSettings(organizationId);

    const payload = {
      sub: userId,
      email,
      organizationId,
      role: user.role,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: authSettings.jwtAccessTokenExpiry,
      secret,
    });

    // Get all organizations this user has access to
    const userOrganizations = await this.getUserOrganizations(userId);

    return {
      access_token: token,
      email,
      user: {
        ...user,
        organizations: userOrganizations,
        currentOrganizationId:
          user.currentOrganizationId || user.organizationId,
      },
    };
  }

  async getAllUsers(organizationId: number) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        permissions: true,
        phone: true,
        photoURL: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUser(
    organizationId: number,
    userId: number,
    dto: Partial<AuthDto>,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) throw new NotFoundException('User not found.');

    // If role is changing, update permissions accordingly
    let permissions = dto.permissions;
    if (dto.role && dto.role !== user.role && !dto.permissions) {
      permissions = this.getPermissionsByRole(dto.role);
    }

    if (dto.password) {
      dto.password = await argon.hash(dto.password);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        permissions: permissions,
        updatedAt: new Date(),
      },
    });
  }

  async deleteUser(organizationId: number, userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Get all organizations a user has access to
   */
  async getUserOrganizations(userId: number) {
    // Get user's primary organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get additional organizations user has access to
    const additionalAccess = await this.prisma.userOrganizationAccess.findMany({
      where: {
        userId,
        isActive: true,
        organizationId: {
          not: user.organizationId, // Exclude primary org
        },
      },
      orderBy: {
        lastAccessedAt: 'desc', // Most recently accessed first
      },
    });

    // Get organization details for additional orgs
    const additionalOrgIds = additionalAccess.map(
      (access) => access.organizationId,
    );
    const additionalOrgs =
      additionalOrgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: additionalOrgIds } },
            select: {
              id: true,
              name: true,
              logoUrl: true,
              address: true,
            },
          })
        : [];

    // Combine primary + additional organizations
    const allOrganizations = [
      {
        id: user.organization.id,
        name: user.organization.name,
        logoUrl: user.organization.logoUrl,
        address: user.organization.address,
        role: user.role,
        permissions: user.permissions,
        isPrimary: true,
        hasAccess: true,
        lastAccessedAt: null, // Primary org doesn't have lastAccessedAt
      },
      ...additionalAccess.map((access) => {
        const org = additionalOrgs.find((o) => o.id === access.organizationId);
        return {
          id: access.organizationId,
          name: org?.name || 'Unknown',
          logoUrl: org?.logoUrl || '',
          address: org?.address || '',
          role: access.role,
          permissions: access.permissions,
          isPrimary: false,
          hasAccess: true,
          lastAccessedAt: access.lastAccessedAt,
        };
      }),
    ];

    return allOrganizations;
  }

  /**
   * Check if user has access to specific organization
   */
  async hasOrganizationAccess(
    userId: number,
    organizationId: number,
  ): Promise<boolean> {
    // Check if it's user's primary organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId === organizationId) {
      return true;
    }

    // Check additional access
    const access = await this.prisma.userOrganizationAccess.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    return access?.isActive || false;
  }

  /**
   * Grant user access to additional organization
   */
  async grantUserAccess(
    userId: number,
    organizationId: number,
    role: string = 'User',
    grantedByUserId?: number,
  ) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Don't allow granting access to user's primary org
    if (user.organizationId === organizationId) {
      throw new ForbiddenException(
        'User already belongs to this organization as primary',
      );
    }

    // Get permissions for the role
    const permissions = this.getPermissionsByRole(role);

    const result = await this.prisma.userOrganizationAccess.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      update: {
        isActive: true,
        role,
        permissions,
        updatedAt: new Date(),
      },
      create: {
        userId,
        organizationId,
        role,
        permissions,
      },
    });

    this.logger.log(
      `Granted ${role} access to user ${userId} for organization ${organizationId}`,
    );
    return result;
  }

  /**
   * Revoke user access to organization
   */
  async revokeUserAccess(userId: number, organizationId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    // Can't revoke access to primary organization
    if (user?.organizationId === organizationId) {
      throw new ForbiddenException(
        "Cannot revoke access to user's primary organization",
      );
    }

    const result = await this.prisma.userOrganizationAccess.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Revoked access for user ${userId} from organization ${organizationId}`,
    );
    return result;
  }

  /**
   * Get user's role and permissions for specific organization
   */
  async getUserRoleInOrganization(userId: number, organizationId: number) {
    // Check if it's user's primary organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        role: true,
        permissions: true,
      },
    });

    if (user?.organizationId === organizationId) {
      return {
        role: user.role,
        permissions: user.permissions,
        isPrimary: true,
      };
    }

    // Check additional access
    const access = await this.prisma.userOrganizationAccess.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!access?.isActive) {
      return null;
    }

    return {
      role: access.role,
      permissions: access.permissions,
      isPrimary: false,
    };
  }

  // NEW: Find user by email with organization details
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // NEW: Get user organizations by email (for login flow)
  async getUserOrganizationsByEmail(email: string) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.getUserOrganizations(user.id);
  }

  // NEW: Validate user credentials without organization context
  async validateUserCredentials(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await argon.verify(user.password, password);
    return isPasswordValid ? user : null;
  }

  // ============ GOOGLE OAUTH METHODS ============

  /**
   * Verify Google ID Token and find/create user
   * Called after Google OAuth callback
   */
  async verifyGoogleToken(googleProfile: {
    googleId: string;
    email: string;
    fullName: string;
    photoUrl?: string;
  }) {
    try {
      // Find user by Google ID first
      let user = await this.prisma.user.findUnique({
        where: { googleId: googleProfile.googleId },
      });

      // If no user with Google ID, try finding by email
      if (!user) {
        user = await this.prisma.user.findUnique({
          where: { email: googleProfile.email },
        });

        // If user exists with email, link Google ID
        if (user) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleProfile.googleId,
              googleEmail: googleProfile.email,
              authProvider: 'google',
              photoURL: googleProfile.photoUrl || user.photoURL,
            },
          });
        }
      }

      if (!user) {
        throw new NotFoundException(
          'User not found. Please ask your admin to add you to the system.',
        );
      }

      // Check if user is active
      if (user.status !== 'Active') {
        throw new ForbiddenException('User account is not active.');
      }

      return user;
    } catch (error) {
      this.logger.error(
        `Google auth verification error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sign token for Google authenticated user
   * Returns JWT token that can be used for API requests
   */
  async signGoogleToken(user: any, organizationId?: number) {
    try {
      const userOrgId = organizationId || user.organizationId;

      // Fetch user's role and permissions for the specific organization
      // This is the same as password login - ensures Google users get permissions
      const roleInfo = await this.getUserRoleInOrganization(user.id, userOrgId);

      if (!roleInfo) {
        throw new ForbiddenException('Access denied to this organization.');
      }

      // Create a user object with organization-specific role and permissions
      const userWithOrgContext = {
        ...user,
        role: roleInfo.role,
        permissions: roleInfo.permissions,
        currentOrganizationId: userOrgId,
        isPrimaryOrg: roleInfo.isPrimary,
      };

      const payload = {
        sub: user.id,
        email: user.email,
        role: roleInfo.role,
        organizationId: userOrgId,
        authProvider: 'google',
      };

      const secret = this.config.get('JWT_SECRET');
      const authSettings = await this.getAuthSettings(userOrgId);

      const token = await this.jwt.signAsync(payload, {
        expiresIn: authSettings.jwtAccessTokenExpiry,
        secret,
      });

      // Get all organizations this user has access to
      const userOrganizations = await this.getUserOrganizations(user.id);

      return {
        access_token: token,
        email: user.email,
        user: {
          ...userWithOrgContext,
          photoURL: user.photoURL,
          authProvider: 'google',
          organizations: userOrganizations,
          currentOrganizationId: userOrgId,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error signing Google token: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to sign token');
    }
  }

  /**
   * Google OAuth login - called after successful Google authentication
   * User must already exist in system (added by admin)
   */
  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    fullName: string;
    photoUrl?: string;
  }) {
    try {
      // Verify Google token and get user
      const user = await this.verifyGoogleToken(googleProfile);

      // Get user's organizations for selection
      const userOrgs = await this.getUserOrganizations(user.id);

      if (userOrgs.length === 0) {
        throw new ForbiddenException('User has no assigned organizations.');
      }

      // Use primary organization or first available
      const primaryOrg = userOrgs.find((org) => org.isPrimary) || userOrgs[0];

      // Sign token
      const token = await this.signGoogleToken(user, primaryOrg.id);

      return {
        ...token,
        organizations: userOrgs.map((org) => ({
          id: org.id,
          name: org.name,
          isPrimary: org.isPrimary,
          logoUrl: org.logoUrl,
        })),
      };
    } catch (error) {
      this.logger.error(`Google login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify Google token (ID Token) sent from frontend
   * Used for web-based Google Sign-In without backend OAuth flow
   */
  async verifyGoogleIdToken(token: string) {
    try {
      // This would normally use google-auth-library to verify the token
      // For now, we'll use this endpoint to verify the token sent from frontend
      const { OAuth2Client } = require('google-auth-library');

      const client = new OAuth2Client(
        this.config.get('GOOGLE_CLIENT_ID'),
        this.config.get('GOOGLE_CLIENT_SECRET'),
      );

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: this.config.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();

      return {
        googleId: payload.sub,
        email: payload.email,
        fullName: payload.name,
        photoUrl: payload.picture,
      };
    } catch (error) {
      this.logger.error(
        `Google ID token verification error: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException('Invalid Google token');
    }
  }
}
