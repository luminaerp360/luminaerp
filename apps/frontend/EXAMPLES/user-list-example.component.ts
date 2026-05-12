/**
 * EXAMPLE: User List Component with Global CRUD Permissions
 *
 * This example shows how to refactor the user-list component to use
 * global CRUD permissions instead of per-module permissions.
 */

import { Component, OnInit } from '@angular/core';
import { UserInterface } from '../src/app/shared/interfaces/auth.interface';
import { AuthService } from '../src/app/shared/Services/auth.service';
import { PermissionService } from '../src/app/shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-user-list',
  template:
    '<div>User List Example Component - See source for implementation</div>',
})
export class UserListComponent implements OnInit {
  users: UserInterface[] = [];
  isLoading: boolean = false;

  // Permission flags - loaded once in ngOnInit
  canCreateUser: boolean = false;
  canUpdateUser: boolean = false;
  canDeleteUser: boolean = false;
  canViewUsers: boolean = false;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    // Load permissions first
    this.loadPermissions();

    // Check if user can view before loading data
    if (this.canViewUsers) {
      this.getAllUsers();
    } else {
      this.toast.error("You don't have permission to view users");
    }
  }

  /**
   * Load all permission flags
   */
  private loadPermissions(): void {
    // Method 1: Using individual permission checks
    const hasModuleAccess = this.permissionService.hasModuleAccess('users');
    this.canViewUsers = hasModuleAccess && this.permissionService.canView();
    this.canCreateUser = hasModuleAccess && this.permissionService.canCreate();
    this.canUpdateUser = hasModuleAccess && this.permissionService.canUpdate();
    this.canDeleteUser = hasModuleAccess && this.permissionService.canDelete();

    // Method 2 (Alternative): Using the helper method
    // this.canViewUsers = this.permissionService.canPerformAction('users', 'view');
    // this.canCreateUser = this.permissionService.canPerformAction('users', 'create');
    // this.canUpdateUser = this.permissionService.canPerformAction('users', 'update');
    // this.canDeleteUser = this.permissionService.canPerformAction('users', 'delete');
  }

  /**
   * Fetch all users from the API
   */
  getAllUsers(): void {
    if (!this.canViewUsers) {
      this.toast.error("You don't have permission to view users");
      return;
    }

    this.isLoading = true;
    this.authService.getAllUsers().subscribe(
      (users: UserInterface[]) => {
        this.users = users;
        this.isLoading = false;
      },
      (error: any) => {
        this.toast.error('Error fetching users');
        this.isLoading = false;
      },
    );
  }

  /**
   * Open modal to create new user
   */
  openCreateModal(): void {
    // Check permission before allowing action
    if (!this.canCreateUser) {
      this.toast.error("You don't have permission to create users");
      return;
    }

    // Open modal logic here
    console.log('Opening create user modal...');
  }

  /**
   * Open modal to edit existing user
   */
  editUser(user: UserInterface): void {
    // Check permission before allowing action
    if (!this.canUpdateUser) {
      this.toast.error("You don't have permission to edit users");
      return;
    }

    // Open edit modal logic here
    console.log('Editing user:', user);
  }

  /**
   * Delete a user
   */
  deleteUser(userId: number): void {
    // Check permission before allowing action
    if (!this.canDeleteUser) {
      this.toast.error("You don't have permission to delete users");
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    this.isLoading = true;
    // API call to delete user would go here
    // this.authService.deleteUser(userId).subscribe(...)
    this.toast.success('User deleted successfully');
    this.getAllUsers();
  }

  /**
   * Open permission settings dialog
   */
  openPermissionDialog(user: UserInterface): void {
    // Only users with update permission can modify user permissions
    if (!this.canUpdateUser) {
      this.toast.error("You don't have permission to update user permissions");
      return;
    }

    // Open permission dialog
    console.log('Opening permission dialog for user:', user);
  }
}
