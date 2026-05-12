import { Component, OnInit, AfterViewInit } from '@angular/core';
import {
  UserInterface,
  UserRolesEnum,
} from '../../../../shared/interfaces/auth.interface';
import { AuthService } from '../../../../shared/Services/auth.service';
import { initFlowbite } from 'flowbite';
import { HotToastService } from '@ngneat/hot-toast';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit, AfterViewInit {
  users: UserInterface[] = [];
  isModalOpen: boolean = false;
  isPasswordModalOpen: boolean = false;
  isLoading: boolean = true;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  editMode: boolean = false;
  editingUserId: string | null = null;
  passwordResetUser: UserInterface | null = null;
  newPassword: string = '';
  confirmPassword: string = '';
  showNewPassword: boolean = false;
  showConfirmNewPassword: boolean = false;
  currentUser: UserInterface | null = null;
  showDeleteConfirm: boolean = false;
  userToDelete: UserInterface | null = null;
  isDeleting: boolean = false;
  
  userDetails: UserInterface = {
    fullName: '',
    id: '',
    email: '',
    username: '',
    phone: '',
    role: '',
    createdBy: '',
    permissions: {},
  };

  constructor(
    private authService: AuthService,
    private toast: HotToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Get current logged-in user and load users
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        // Load users with proper organization context
        this.getAllUsers();
      }
    });
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
    if (!this.isModalOpen) {
      this.resetForm();
      this.editMode = false;
      this.editingUserId = null;
    } else {
      // When opening modal for create, auto-populate createdBy
      if (!this.editMode && this.currentUser) {
        this.userDetails.createdBy = this.currentUser.fullName || this.currentUser.username || '';
      }
    }
  }

  togglePasswordModal() {
    this.isPasswordModalOpen = !this.isPasswordModalOpen;
    if (!this.isPasswordModalOpen) {
      this.passwordResetUser = null;
      this.newPassword = '';
      this.confirmPassword = '';
      this.showNewPassword = false;
      this.showConfirmNewPassword = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getAllUsers() {
    this.isLoading = true;
    
    // Always use organization-scoped endpoint with correct organization ID
    const orgId = this.getOrganizationIdFromToken();
    
    if (orgId) {
      this.authService.getUsersByOrganization(orgId).subscribe(
        (users: UserInterface[]) => {
          this.users = users;
          this.isLoading = false;
          console.log(`Loaded ${users.length} users from organization ${orgId}`, users);
        },
        (error) => {
          console.error('Error fetching users from org endpoint:', error);
          this.toast.error('Error fetching users');
          this.isLoading = false;
        },
      );
    } else {
      this.toast.error('Unable to determine organization');
      this.isLoading = false;
    }
  }

  addUser() {
    this.isLoading = true;
    
    if (this.editMode) {
      // Update existing user
      this.authService.updateUser(this.userDetails.id as any, this.userDetails).subscribe(
        (user: UserInterface) => {
          this.toast.success('User updated successfully');
          this.toggleModal();
          this.getAllUsers();
          this.resetForm();
        },
        (error) => {
          this.toast.error('Error updating user');
          console.log(error);
          this.isLoading = false;
        },
      );
    } else {
      // Create new user
      this.authService.createUser(this.userDetails).subscribe(
        (user: UserInterface) => {
          this.toast.success('User created successfully');
          this.toggleModal();
          this.getAllUsers();
          this.resetForm();
        },
        (error) => {
          this.toast.error('Error creating user');
          console.log(error);
          this.isLoading = false;
        },
      );
    }
  }

  resetForm() {
    this.userDetails = {
      fullName: '',
      id: '',
      email: '',
      username: '',
      phone: '',
      role: '',
      createdBy: this.currentUser ? (this.currentUser.fullName || this.currentUser.username || '') : '',
      permissions: {},
    };
  }

  openPermissions(user: UserInterface) {
    // Navigate to the user permissions page with user ID as route parameter
    this.router.navigate(['/user-permissions', user.id]);
  }

  editUser(user: UserInterface) {
    this.editMode = true;
    this.editingUserId = user.id as string;
    this.userDetails = { ...user };
    // Don't override createdBy when editing
    this.isModalOpen = true;
  }

  resetPassword(user: UserInterface) {
    this.passwordResetUser = user;
    this.togglePasswordModal();
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.toast.error('Passwords do not match');
      return;
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      this.toast.error('Password must be at least 6 characters');
      return;
    }

    if (!this.passwordResetUser?.id) {
      this.toast.error('User not selected');
      return;
    }

    this.isLoading = true;
    this.authService
      .changeUserPassword(this.passwordResetUser.id, this.newPassword)
      .subscribe(
        (response) => {
          this.toast.success('Password changed successfully');
          this.togglePasswordModal();
          this.isLoading = false;
        },
        (error) => {
          this.toast.error('Error changing password');
          console.log(error);
          this.isLoading = false;
        },
      );
  }

  private getOrganizationIdFromToken(): number | null {
    // Try to get organizationId from currentUser first
    if (this.currentUser?.organizationId) {
      return Number(this.currentUser.organizationId);
    }
    
    // If not available in user object, try to extract from JWT token
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.organizationId || payload?.org || 1; // fallback to 1 if not found
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
    
    return 1; // fallback organization ID
  }

  deleteUser(user: UserInterface) {
    this.userToDelete = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
    this.isDeleting = false;
  }

  executeDelete() {
    if (!this.userToDelete?.id) {
      this.toast.error('User not selected');
      return;
    }

    this.isDeleting = true;
    this.authService.deleteUser(this.userToDelete.id).subscribe(
      (response) => {
        this.toast.success('User deleted successfully');
        this.cancelDelete();
        this.getAllUsers();
      },
      (error) => {
        this.toast.error('Error deleting user');
        console.error('Error deleting user:', error);
        this.isDeleting = false;
      },
    );
  }
}
