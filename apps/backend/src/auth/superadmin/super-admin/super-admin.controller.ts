import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  Put,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import {
  SuperAdminAuthDto,
  CreateSuperAdminDto,
  AssignUserOrganizationDto,
  BulkAssignUserOrganizationDto,
  RevokeUserOrganizationDto,
} from './dto/superAdminAuth.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('login')
  async superAdminLogin(@Body() dto: SuperAdminAuthDto) {
    return this.superAdminService.superAdminLogin(dto);
  }

  @Post('create')
  async createSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.superAdminService.createSuperAdmin(dto);
  }

  // User Organization Assignment Endpoints

  @Post('assign-user-organization')
  async assignUserToOrganization(@Body() dto: AssignUserOrganizationDto) {
    return this.superAdminService.assignUserToOrganization(dto);
  }

  @Post('bulk-assign-user-organizations')
  async bulkAssignUserOrganizations(
    @Body() dto: BulkAssignUserOrganizationDto,
  ) {
    return this.superAdminService.bulkAssignUserOrganizations(dto);
  }

  @Delete('revoke-user-organization')
  async revokeUserOrganizationAccess(@Body() dto: RevokeUserOrganizationDto) {
    return this.superAdminService.revokeUserOrganizationAccess(dto);
  }

  @Get('user-organization-assignments')
  async getAllUserOrganizationAssignments() {
    return this.superAdminService.getAllUserOrganizationAssignments();
  }

  @Get('user-organization-assignments/:userId')
  async getUserOrganizationAssignments(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.superAdminService.getUserOrganizationAssignments(userId);
  }
}
