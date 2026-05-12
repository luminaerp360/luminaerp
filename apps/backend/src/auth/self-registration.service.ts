// apps/backend/src/auth/self-registration.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailsService } from 'src/emails/emails.service';
import * as argon from 'argon2';
import { randomBytes } from 'crypto';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SelfRegisterDto {
  @IsString()
  organizationName: string;

  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class GoogleRegisterDto {
  @IsString()
  token: string;

  @IsString()
  organizationName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

const TRIAL_MONTHS = 3;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class SelfRegistrationService {
  private readonly logger = new Logger(SelfRegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
    private emailsService: EmailsService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateLicenseKey(): string {
    return `POS-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private trialEndDate(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + TRIAL_MONTHS);
    return d;
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private verificationTokenExpiry(): Date {
    const d = new Date();
    d.setHours(d.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);
    return d;
  }

  /** Issue a JWT for the registered admin user */
  private async signToken(
    userId: number,
    email: string,
    organizationId: number,
    role: string,
    trialExpiresAt: Date,
    subscriptionStatus: string,
  ) {
    const secret = this.config.get<string>('JWT_SECRET');
    const expiresIn = this.config.get<string>('JWT_EXPIRATION') || '24h';

    const payload = {
      sub: userId,
      email,
      organizationId,
      role,
      trialExpiresAt,
      subscriptionStatus,
    };

    const token = await this.jwt.signAsync(payload, { secret, expiresIn });
    return { access_token: token };
  }

  // ─── Email Registration ───────────────────────────────────────────────────────

  /**
   * Self-register: creates a new organization + admin user + 3-month trial.
   * Sends a verification email. Login is blocked until email is verified.
   */
  async registerWithEmail(dto: SelfRegisterDto) {
    // 1. Check if email is already taken
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Validate password strength
    if (dto.password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long.',
      );
    }

    const hash = await argon.hash(dto.password);
    const licenseKey = this.generateLicenseKey();
    const trialEnd = this.trialEndDate();
    const now = new Date();

    // 3. Create org + subscription + admin user in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          subscription: {
            create: {
              plan: SubscriptionPlan.BASIC,
              status: SubscriptionStatus.TRIAL,
              startDate: now,
              endDate: trialEnd,
              maxDevices: 2,
              maxUsers: 5,
              maxLocations: 1,
              licenseKey,
              price: 0,
              autoRenew: false,
            },
          },
        },
        include: { subscription: true },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hash,
          fullName: dto.fullName,
          username: dto.email.split('@')[0],
          phone: dto.phone || '',
          role: 'admin',
          status: 'Active',
          authProvider: 'email',
          isEmailVerified: false,
          createdBy: 'self-registration',
          permissions: {
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
            canDelete: true,
            canUpdate: true,
            canCreate: true,
            canView: true,
          },
          organization: { connect: { id: org.id } },
        },
      });

      return { org, user };
    });

    // 4. Create verification token
    const rawToken = this.generateVerificationToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        token: rawToken,
        email: dto.email,
        userId: result.user.id,
        expiresAt: this.verificationTokenExpiry(),
      },
    });

    // 5. Send verification email (non-blocking – don't fail registration if email fails)
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    this.sendVerificationEmail(
      dto.email,
      dto.fullName,
      dto.organizationName,
      verifyLink,
    ).catch((err) =>
      this.logger.error('Failed to send verification email', err),
    );

    return {
      success: true,
      requiresEmailVerification: true,
      message:
        'Registration successful! Please check your email to verify your account.',
      email: dto.email,
      organizationId: result.org.id,
      trialEndsAt: result.org.subscription.endDate,
    };
  }

  // ─── Google Registration ──────────────────────────────────────────────────────

  /**
   * Self-register via Google: verifies ID token, creates org + admin user (auto-verified).
   */
  async registerWithGoogle(dto: GoogleRegisterDto) {
    // 1. Verify Google token
    const profile = await this.verifyGoogleToken(dto.token);

    // 2. Check if Google user already registered
    const existingByGoogle = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (existingByGoogle) {
      throw new ConflictException(
        'A Google account with this identity is already registered. Please sign in instead.',
      );
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in or use a different Google account.',
      );
    }

    const licenseKey = this.generateLicenseKey();
    const trialEnd = this.trialEndDate();
    const now = new Date();

    // 3. Create org + subscription + admin user
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          subscription: {
            create: {
              plan: SubscriptionPlan.BASIC,
              status: SubscriptionStatus.TRIAL,
              startDate: now,
              endDate: trialEnd,
              maxDevices: 2,
              maxUsers: 5,
              maxLocations: 1,
              licenseKey,
              price: 0,
              autoRenew: false,
            },
          },
        },
        include: { subscription: true },
      });

      const user = await tx.user.create({
        data: {
          email: profile.email,
          password: await argon.hash(randomBytes(32).toString('hex')), // random unusable password
          fullName: profile.fullName,
          username: profile.email.split('@')[0],
          phone: dto.phone || '',
          role: 'admin',
          status: 'Active',
          authProvider: 'google',
          googleId: profile.googleId,
          googleEmail: profile.email,
          isEmailVerified: true, // Google verifies emails
          emailVerifiedAt: new Date(),
          photoURL: profile.photoUrl || undefined,
          createdBy: 'self-registration-google',
          permissions: {
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
            canDelete: true,
            canUpdate: true,
            canCreate: true,
            canView: true,
          },
          organization: { connect: { id: org.id } },
        },
      });

      return { org, user };
    });

    // 4. Issue JWT immediately (Google registration = auto login)
    const tokenData = await this.signToken(
      result.user.id,
      result.user.email,
      result.org.id,
      result.user.role,
      result.org.subscription.endDate,
      SubscriptionStatus.TRIAL,
    );

    return {
      success: true,
      requiresEmailVerification: false,
      message: `Welcome to Lumina ERP, ${profile.fullName}! Your 3-month trial has started.`,
      access_token: tokenData.access_token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        photoURL: result.user.photoURL,
        organizationId: result.org.id,
        organizationName: result.org.name,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
      },
      subscription: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: result.org.subscription.endDate,
        daysRemaining: Math.ceil(
          (result.org.subscription.endDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      },
    };
  }

  // ─── Email Verification ───────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new NotFoundException('Invalid or expired verification link.');
    }

    if (record.used) {
      throw new BadRequestException(
        'This verification link has already been used.',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This verification link has expired. Please request a new one.',
      );
    }

    // Mark user as verified + mark token as used in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true },
      });
    });

    return {
      success: true,
      message: 'Email verified successfully! You can now log in.',
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists – anti-enumeration
      return {
        success: true,
        message:
          'If this email is registered and unverified, a new link has been sent.',
      };
    }

    if (user.isEmailVerified) {
      return {
        success: true,
        message: 'Your email is already verified. Please log in.',
      };
    }

    // Invalidate previous tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Create new token
    const rawToken = this.generateVerificationToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        token: rawToken,
        email,
        userId: user.id,
        expiresAt: this.verificationTokenExpiry(),
      },
    });

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
    });

    this.sendVerificationEmail(
      email,
      user.fullName,
      org?.name || '',
      verifyLink,
    ).catch((err) =>
      this.logger.error('Failed to resend verification email', err),
    );

    return {
      success: true,
      message:
        'If this email is registered and unverified, a new link has been sent.',
    };
  }

  // ─── Trial Status ─────────────────────────────────────────────────────────────

  async getTrialStatus(organizationId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return { isActive: false, message: 'No subscription found.' };
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.endDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const isExpired =
      subscription.status === SubscriptionStatus.TRIAL &&
      subscription.endDate < now;

    if (isExpired) {
      // Auto-expire the subscription
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      return {
        isActive: false,
        isExpired: true,
        status: SubscriptionStatus.EXPIRED,
        message: 'Your trial has expired. Please contact support to upgrade.',
        daysRemaining: 0,
        endDate: subscription.endDate,
      };
    }

    return {
      isActive: true,
      isExpired: false,
      status: subscription.status,
      daysRemaining,
      endDate: subscription.endDate,
      plan: subscription.plan,
      isTrial: subscription.status === SubscriptionStatus.TRIAL,
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────────

  private async verifyGoogleToken(token: string): Promise<{
    googleId: string;
    email: string;
    fullName: string;
    photoUrl?: string;
  }> {
    try {
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
    } catch {
      throw new BadRequestException('Invalid Google token. Please try again.');
    }
  }

  private async sendVerificationEmail(
    email: string,
    fullName: string,
    organizationName: string,
    verifyLink: string,
  ): Promise<void> {
    await this.emailsService.sendEmail({
      to: email,
      subject: 'Verify your Lumina ERP account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
          <div style="background: #fff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1d4ed8; font-size: 28px; margin: 0;">Lumina ERP</h1>
              <p style="color: #6b7280; margin: 4px 0 0;">Enterprise Resource Planning</p>
            </div>

            <h2 style="color: #111827; font-size: 22px; margin-bottom: 8px;">Welcome, ${fullName}!</h2>
            <p style="color: #374151; margin-bottom: 24px;">
              Thank you for registering <strong>${organizationName}</strong> on Lumina ERP.
              Your <strong>free 3-month trial</strong> is ready — just verify your email to get started.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyLink}"
                style="background: #1d4ed8; color: #fff; padding: 14px 32px; border-radius: 8px;
                       text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                Verify My Email
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              This link expires in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.
            </p>

            <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
                If the button doesn't work, copy and paste this URL into your browser:<br/>
                <a href="${verifyLink}" style="color: #1d4ed8; word-break: break-all;">${verifyLink}</a>
              </p>
            </div>
          </div>
        </div>
      `,
    });
  }
}
