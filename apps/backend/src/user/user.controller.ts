// src/user/user.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from 'src/auth/guard';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

// @UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // Get current user (profile)
  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  // Admin endpoint: Get all users across all organizations
  @Get('all')
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  // Get users for a specific organization
  @Get('organization/:id')
  getUsersByOrganization(@Param('id', ParseIntPipe) organizationId: number) {
    return this.userService.getUsersByOrganization(organizationId);
  }

  // Admin endpoint: Change a user's password
  @Patch('change-password/:id')
  changeUserPassword(
    @Body() dto: ChangePasswordDto,
    @Param('id', ParseIntPipe) userId: number,
  ) {
    return this.userService.changeUserPassword(userId, dto.newPassword);
  }

  // Self: Change own password (requires current password verification)
  @Patch('change-own-password')
  changeOwnPassword(
    @GetUser() user: User,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changeOwnPassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // Get a specific user by ID
  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) userId: number) {
    return this.userService.getUserById(userId);
  }

  // Create a new user
  @Post()
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.USERS,
    description: 'Created a new user',
    entityType: 'User',
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  // Update a user
  @Patch(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.USERS,
    description: 'Updated user details',
    entityType: 'User',
  })
  updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
    @GetUser() user: User,
  ) {
    // Check if the user is updating themselves or is an admin
    if (user.id === userId || user.role.toLowerCase() === 'admin') {
      return this.userService.updateUser(userId, dto);
    }
    throw new ForbiddenException('You are not authorized to update this user');
  }

  // Delete a user
  @Delete(':id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.USERS,
    description: 'Deleted a user',
    entityType: 'User',
  })
  deleteUser(@Param('id', ParseIntPipe) userId: number) {
    return this.userService.deleteUser(userId);
  }
}
