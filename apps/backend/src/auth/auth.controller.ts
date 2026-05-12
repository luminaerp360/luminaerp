// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import {
  SelfRegistrationService,
  SelfRegisterDto,
  GoogleRegisterDto,
} from './self-registration.service';

@Controller('organizations/:organizationId/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: AuthDto,
  ) {
    try {
      return await this.authService.signUp(organizationId, dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Signup failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ORIGINAL: Login to specific organization (keep for backwards compatibility)
  @Post('loginn')
  async signIn(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: AuthDto,
  ) {
    try {
      return await this.authService.signInToSpecificOrganization(
        organizationId,
        dto,
        true, // Remember this organization choice
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // NEW: Smart login that remembers last organization
  @Post('login')
  async smartLogin(@Body() dto: AuthDto) {
    try {
      return await this.authService.signInWithLastOrganization(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // NEW: Fast login to specific organization (optimized)
  @Post('fast-login')
  async fastLogin(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: AuthDto,
  ) {
    try {
      return await this.authService.fastSignInToOrganization(
        organizationId,
        dto,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Fast login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // NEW: Login to specific organization with memory
  @Post('login-to-organization')
  async loginToOrganization(
    @Body()
    dto: {
      email: string;
      password: string;
      organizationId: number;
      remember?: boolean;
    },
  ) {
    try {
      const authDto: AuthDto = {
        email: dto.email,
        password: dto.password,
      } as AuthDto;

      return await this.authService.signInToSpecificOrganization(
        dto.organizationId,
        authDto,
        dto.remember ?? true,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Organization login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // NEW: Get user's preferred organization for login
  @Post('get-preferred-organization')
  async getPreferredOrganization(@Body() dto: { email: string }) {
    try {
      const user = await this.authService.findUserByEmail(dto.email);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }

      const preferredOrgId =
        await this.authService.getPreferredLoginOrganization(user.id);
      const userOrganizations = await this.authService.getUserOrganizations(
        user.id,
      );

      return {
        success: true,
        preferredOrganizationId: preferredOrgId,
        availableOrganizations: userOrganizations.map((org) => ({
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          isPrimary: org.isPrimary,
          role: org.role,
          address: org.address,
          lastAccessedAt: org.lastAccessedAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error getting preferred organization',
        error: error.message,
      };
    }
  }

  // NEW: Get user organizations by email (for login flow)
  @Post('user-organizations')
  async getUserAvailableOrganizations(@Body() dto: { email: string }) {
    try {
      const organizations = await this.authService.getUserOrganizationsByEmail(
        dto.email,
      );

      return {
        success: true,
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          isPrimary: org.isPrimary,
          role: org.role,
          address: org.address,
          lastAccessedAt: org.lastAccessedAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Could not fetch user organizations',
        statusCode: error.status || HttpStatus.BAD_REQUEST,
      };
    }
  }

  // NEW: Validate user credentials (for pre-login checks)
  @Post('validate-credentials')
  async validateCredentials(@Body() dto: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUserCredentials(
        dto.email,
        dto.password,
      );

      if (!user) {
        return {
          valid: false,
          message: 'Invalid credentials',
        };
      }

      const organizations = await this.authService.getUserOrganizations(
        user.id,
      );

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          primaryOrganizationId: user.organizationId,
        },
        organizationCount: organizations.length,
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          isPrimary: org.isPrimary,
          role: org.role,
        })),
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Error validating credentials',
        error: error.message,
      };
    }
  }

  @Get('users')
  async getAllUsers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    try {
      return await this.authService.getAllUsers(organizationId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch users',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':userId/organizations')
  async getUserOrganizations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    try {
      return await this.authService.getUserOrganizations(userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch user organizations',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('grant-access')
  async grantUserAccess(
    @Param('organizationId', ParseIntPipe) currentOrgId: number,
    @Body()
    dto: {
      userId: number;
      targetOrganizationId: number;
      role?: string;
      grantedBy?: number;
    },
  ) {
    try {
      return await this.authService.grantUserAccess(
        dto.userId,
        dto.targetOrganizationId,
        dto.role || 'User',
        dto.grantedBy,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to grant access',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':userId/access/:targetOrgId')
  async revokeUserAccess(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('targetOrgId', ParseIntPipe) targetOrgId: number,
  ) {
    try {
      return await this.authService.revokeUserAccess(userId, targetOrgId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to revoke access',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':userId/access/:targetOrgId')
  async checkUserAccess(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('targetOrgId', ParseIntPipe) targetOrgId: number,
  ) {
    try {
      const hasAccess = await this.authService.hasOrganizationAccess(
        userId,
        targetOrgId,
      );
      const roleInfo = hasAccess
        ? await this.authService.getUserRoleInOrganization(userId, targetOrgId)
        : null;

      return {
        hasAccess,
        organizationId: targetOrgId,
        userId,
        ...roleInfo,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check access',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // NEW: Check if user can access specific organization (pre-login check)
  @Post('check-organization-access')
  async checkOrganizationAccess(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: { email: string },
  ) {
    try {
      const user = await this.authService.findUserByEmail(dto.email);
      if (!user) {
        return {
          hasAccess: false,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }

      const hasAccess = await this.authService.hasOrganizationAccess(
        user.id,
        organizationId,
      );

      if (hasAccess) {
        const roleInfo = await this.authService.getUserRoleInOrganization(
          user.id,
          organizationId,
        );
        return {
          hasAccess: true,
          role: roleInfo?.role,
          isPrimary: roleInfo?.isPrimary,
          organizationId,
          userId: user.id,
        };
      }

      // Get user's available organizations for helpful error message
      const userOrganizations = await this.authService.getUserOrganizations(
        user.id,
      );

      return {
        hasAccess: false,
        message: "You don't have access to this organization",
        availableOrganizations: userOrganizations.map((org) => ({
          id: org.id,
          name: org.name,
          isPrimary: org.isPrimary,
          role: org.role,
        })),
      };
    } catch (error) {
      return {
        hasAccess: false,
        message: 'Error checking access',
        error: error.message,
      };
    }
  }

  @Put('users/:userId')
  async updateUser(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: Partial<AuthDto>,
  ) {
    try {
      return await this.authService.updateUser(organizationId, userId, dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('users/:userId')
  async deleteUser(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    try {
      return await this.authService.deleteUser(organizationId, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // NEW: Bulk operations for user organization access
  @Post('bulk-grant-access')
  async bulkGrantAccess(
    @Param('organizationId', ParseIntPipe) currentOrgId: number,
    @Body()
    dto: {
      userIds: number[];
      targetOrganizationId: number;
      role?: string;
      grantedBy?: number;
    },
  ) {
    try {
      const results = [];
      const errors = [];

      for (const userId of dto.userIds) {
        try {
          const result = await this.authService.grantUserAccess(
            userId,
            dto.targetOrganizationId,
            dto.role || 'User',
            dto.grantedBy,
          );
          results.push({ userId, success: true, result });
        } catch (error) {
          errors.push({ userId, success: false, error: error.message });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: dto.userIds.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Bulk grant access failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('bulk-revoke-access')
  async bulkRevokeAccess(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body()
    dto: {
      userIds: number[];
      targetOrganizationId: number;
    },
  ) {
    try {
      const results = [];
      const errors = [];

      for (const userId of dto.userIds) {
        try {
          const result = await this.authService.revokeUserAccess(
            userId,
            dto.targetOrganizationId,
          );
          results.push({ userId, success: true, result });
        } catch (error) {
          errors.push({ userId, success: false, error: error.message });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: dto.userIds.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Bulk revoke access failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // NEW: Get organization access analytics
  // @Get('organization-access-analytics')
  // async getOrganizationAccessAnalytics(
  //   @Param('organizationId', ParseIntPipe) organizationId: number,
  // ) {
  //   try {
  //     // Get users who have access to this organization
  //     const primaryUsers = await this.authService.getAllUsers(organizationId);
  //     const additionalAccessUsers =
  //       await this.prisma.userOrganizationAccess.findMany({
  //         where: {
  //           organizationId,
  //           isActive: true,
  //         },
  //         include: {
  //           user: {
  //             select: {
  //               id: true,
  //               email: true,
  //               fullName: true,
  //               organizationId: true,
  //             },
  //           },
  //         },
  //       });

  //     const totalUsers = primaryUsers.length + additionalAccessUsers.length;
  //     const roleDistribution = {};
  //     const accessTypeDistribution = {
  //       primary: primaryUsers.length,
  //       additional: additionalAccessUsers.length,
  //     };

  //     // Count roles
  //     primaryUsers.forEach((user) => {
  //       roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
  //     });

  //     additionalAccessUsers.forEach((access) => {
  //       roleDistribution[access.role] =
  //         (roleDistribution[access.role] || 0) + 1;
  //     });

  //     return {
  //       organizationId,
  //       totalUsers,
  //       accessTypeDistribution,
  //       roleDistribution,
  //       recentActivity: additionalAccessUsers
  //         .filter((access) => access.lastAccessedAt)
  //         .sort(
  //           (a, b) =>
  //             new Date(b.lastAccessedAt).getTime() -
  //             new Date(a.lastAccessedAt).getTime(),
  //         )
  //         .slice(0, 10)
  //         .map((access) => ({
  //           userId: access.userId,
  //           userEmail: access.user.email,
  //           userFullName: access.user.fullName,
  //           role: access.role,
  //           lastAccessedAt: access.lastAccessedAt,
  //         })),
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to get analytics',
  //       error.status || HttpStatus.BAD_REQUEST,
  //     );
  //   }
  // }
}

// Additional controller for global auth operations (without organization context)
@Controller('auth')
export class GlobalAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly selfRegService: SelfRegistrationService,
  ) {}

  // Simple login endpoint (no organization ID required)
  @Post('login')
  async login(@Body() dto: AuthDto) {
    try {
      return await this.authService.signInWithLastOrganization(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // Global smart login (organization-agnostic) - alias for backwards compatibility
  @Post('smart-login')
  async globalSmartLogin(@Body() dto: AuthDto) {
    try {
      return await this.authService.signInWithLastOrganization(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // Global user organizations lookup
  @Post('user-organizations')
  async getUserOrganizations(@Body() dto: { email: string }) {
    try {
      const organizations = await this.authService.getUserOrganizationsByEmail(
        dto.email,
      );

      return {
        success: true,
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          isPrimary: org.isPrimary,
          role: org.role,
          address: org.address,
          lastAccessedAt: org.lastAccessedAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Could not fetch user organizations',
        statusCode: error.status || HttpStatus.BAD_REQUEST,
      };
    }
  }

  // Global credential validation
  @Post('validate-credentials')
  async validateCredentials(@Body() dto: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUserCredentials(
        dto.email,
        dto.password,
      );

      if (!user) {
        return {
          valid: false,
          message: 'Invalid credentials',
        };
      }

      const organizations = await this.authService.getUserOrganizations(
        user.id,
      );
      const preferredOrgId =
        await this.authService.getPreferredLoginOrganization(user.id);

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          primaryOrganizationId: user.organizationId,
        },
        preferredOrganizationId: preferredOrgId,
        organizationCount: organizations.length,
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          isPrimary: org.isPrimary,
          role: org.role,
          lastAccessedAt: org.lastAccessedAt,
        })),
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Error validating credentials',
        error: error.message,
      };
    }
  }

  // Direct login to specific organization
  @Post('login-to-organization')
  async loginToOrganization(
    @Body()
    dto: {
      email: string;
      password: string;
      organizationId: number;
      remember?: boolean;
    },
  ) {
    try {
      const authDto: AuthDto = {
        email: dto.email,
        password: dto.password,
      } as AuthDto;

      return await this.authService.signInToSpecificOrganization(
        dto.organizationId,
        authDto,
        dto.remember ?? true,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Organization login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // OPTIMIZED: Fast login to specific organization
  @Post('fast-login-to-organization')
  async fastLoginToOrganization(
    @Body()
    dto: {
      email: string;
      password: string;
      organizationId: number;
    },
  ) {
    try {
      const authDto: AuthDto = {
        email: dto.email,
        password: dto.password,
      } as AuthDto;

      return await this.authService.fastSignInToOrganization(
        dto.organizationId,
        authDto,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Fast organization login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ============ GOOGLE OAUTH ENDPOINTS ============

  /**
   * Google Sign-In endpoint
   * Frontend sends the Google ID token received from Google Sign-In
   * This endpoint verifies the token and logs the user in
   */
  @Post('google-signin')
  async googleSignIn(@Body() dto: { token: string }) {
    try {
      if (!dto.token) {
        throw new HttpException(
          'Google token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verify the Google ID token
      const googleProfile = await this.authService.verifyGoogleIdToken(
        dto.token,
      );

      // Login user with Google profile
      const result = await this.authService.googleLogin(googleProfile);

      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Google sign-in failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Google login to specific organization
   * After Google authentication, user can select which organization to login to
   */
  @Post('google-login-to-organization')
  async googleLoginToOrganization(
    @Body()
    dto: {
      token: string;
      organizationId: number;
    },
  ) {
    try {
      if (!dto.token) {
        throw new HttpException(
          'Google token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verify the Google ID token
      const googleProfile = await this.authService.verifyGoogleIdToken(
        dto.token,
      );

      // Verify user exists
      const user = await this.authService.verifyGoogleToken(googleProfile);

      // Sign token for specific organization
      const token = await this.authService.signGoogleToken(
        user,
        dto.organizationId,
      );

      return token;
    } catch (error) {
      throw new HttpException(
        error.message || 'Google organization login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Get user info from Google token
   * Useful for displaying user info after Google Sign-In
   */
  @Post('google-user-info')
  async getGoogleUserInfo(@Body() dto: { token: string }) {
    try {
      if (!dto.token) {
        throw new HttpException(
          'Google token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verify token and get profile
      const googleProfile = await this.authService.verifyGoogleIdToken(
        dto.token,
      );

      // Check if user exists in system
      const user = await this.authService.verifyGoogleToken(googleProfile);

      const organizations = await this.authService.getUserOrganizations(
        user.id,
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          photoURL: user.photoURL,
        },
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          isPrimary: org.isPrimary,
          logoUrl: org.logoUrl,
        })),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Could not get Google user information',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ============ SELF-REGISTRATION ENDPOINTS ============

  /**
   * Self-register a new organization + admin user via email/password.
   * Creates a 3-month TRIAL subscription. Sends verification email.
   */
  @Post('register')
  async selfRegister(@Body() dto: SelfRegisterDto) {
    try {
      if (
        !dto.organizationName ||
        !dto.fullName ||
        !dto.email ||
        !dto.password
      ) {
        throw new HttpException(
          'organizationName, fullName, email, and password are required.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.selfRegService.registerWithEmail(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Registration failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Self-register via Google OAuth.
   * Creates a 3-month TRIAL subscription. User is auto-verified and logged in.
   */
  @Post('google-register')
  async googleRegister(@Body() dto: GoogleRegisterDto) {
    try {
      if (!dto.token || !dto.organizationName) {
        throw new HttpException(
          'Google token and organizationName are required.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.selfRegService.registerWithGoogle(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Google registration failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Verify email address using the token sent by email.
   */
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    try {
      if (!token) {
        throw new HttpException(
          'Verification token is required.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.selfRegService.verifyEmail(token);
    } catch (error) {
      throw new HttpException(
        error.message || 'Email verification failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Resend the verification email to an unverified address.
   */
  @Post('resend-verification')
  async resendVerification(@Body() dto: { email: string }) {
    try {
      if (!dto.email) {
        throw new HttpException('Email is required.', HttpStatus.BAD_REQUEST);
      }
      return await this.selfRegService.resendVerification(dto.email);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to resend verification',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get trial/subscription status for an organization.
   */
  @Get('trial-status/:organizationId')
  async getTrialStatus(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    try {
      return await this.selfRegService.getTrialStatus(organizationId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get trial status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
