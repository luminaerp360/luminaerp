// src/user/user.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Function to assign permissions based on role (same as in AuthService)
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

    // Normalize role to lowercase for case-insensitive comparison
    const normalizedRole = role.toLowerCase();

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
        // All other permissions are false by default
      };
    }

    // For other roles, return empty permissions (or you can define other role types)
    return {};
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<Partial<User>[]> {
    try {
      const users = await this.prisma.user.findMany();
      // Remove password from each user
      return users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      this.logger.error(
        `Error fetching all users: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  // Get users by organization
  async getUsersByOrganization(
    organizationId: number,
  ): Promise<Partial<User>[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { organizationId },
      });
      // Remove password from each user
      return users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      this.logger.error(
        `Error fetching users for organization ${organizationId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  // Get single user
  async getUserById(userId: number): Promise<Partial<User>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Remove password from user
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  // Create a new user
  async createUser(dto: CreateUserDto): Promise<Partial<User>> {
    try {
      const hash = await argon.hash(dto.password);

      // Assign permissions based on role if not explicitly provided
      const permissions =
        dto.permissions || this.getPermissionsByRole(dto.role);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          fullName: dto.fullName,
          username: dto.username,
          role: dto.role,
          phone: dto.phone || '',
          photoURL:
            dto.photoURL ||
            'https://res.cloudinary.com/dfsd8beyu/image/upload/v1720257318/defaultUser_f7bvpx.webp',
          status: dto.status || 'Active',
          createdBy: dto.createdBy || '',
          permissions: permissions,
          organization: {
            connect: {
              id: dto.organizationId,
            },
          },
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already registered.');
        }
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  // Update a user
  async updateUser(userId: number, dto: UpdateUserDto): Promise<Partial<User>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Prepare update data
      const updateData: any = { ...dto };

      // If password is being updated, hash it
      if (dto.password) {
        updateData.password = await argon.hash(dto.password);
      }

      // If role is changing, update permissions accordingly (unless explicitly provided)
      if (dto.role && dto.role !== user.role && !dto.permissions) {
        updateData.permissions = this.getPermissionsByRole(dto.role);
      }

      // Update the user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating user ${userId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already in use.');
        }
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  // Change user's password (admin function)
  async changeUserPassword(
    userId: number,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const hashedPassword = await argon.hash(newPassword);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      // Error handling remains the same
    }
  }

  // Change own password (verifies current password first)
  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Verify current password
      const isCurrentPasswordValid = await argon.verify(
        user.password,
        currentPassword,
      );

      if (!isCurrentPasswordValid) {
        throw new ForbiddenException('Current password is incorrect');
      }

      const hashedPassword = await argon.hash(newPassword);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error changing password for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error changing password');
    }
  }

  // Delete a user
  async deleteUser(
    userId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      await this.prisma.user.delete({
        where: { id: userId },
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error deleting user');
    }
  }
}
