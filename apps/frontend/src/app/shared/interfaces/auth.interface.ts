import { DatabaseItemInterface } from './database-item.interface';

export interface ResetPasswordInterface {
  email: string;
}

export interface PasswordResetInterface {
  org: number;
  uid: number;
  token: string;
}

export interface SetNewPasswordInterface extends PasswordResetInterface {
  password: string;
}

export interface LoginInterface {
  email: string;
  password: string;
}

export interface OrganizationLoginInterface extends LoginInterface {
  orgId: string;
}

export type PermissionType = 'admin' | 'waiter' | 'manager' | 'sales';

export enum UserRolesEnum {
  ADMIN = 'Admin',
  SALES = 'Sales',
  ACCOUNTANT = 'Accountant',
}

export type permissionAccessType =
  | 'read'
  | 'create'
  | 'update'
  | 'professional'
  | 'fullAccess';

export interface PermissionInterface extends DatabaseItemInterface {
  userId?: number | string | any | undefined;
  permission: PermissionType;
  admin: boolean | number;
  create: boolean | number;
  read: boolean | number;
  update: boolean | number;
  delete: boolean | number;
  professional: boolean | number;
}

export interface UserPermissions {
  // Module access permissions
  lpo?: boolean;
  sales?: boolean;
  stock?: boolean;
  users?: boolean;
  reports?: boolean;
  setting?: boolean;
  products?: boolean;
  categories?: boolean;
  credit_sales?: boolean;
  customers?: boolean;
  dashboard?: boolean;
  inventory?: boolean;
  quotations?: boolean;
  suppliers?: boolean;

  // Global CRUD operation permissions
  canDelete?: boolean;
  canUpdate?: boolean;
  canCreate?: boolean;
  canView?: boolean;
}

export interface UserInterface extends DatabaseItemInterface {
  password?: any;
  fullName: string | any;
  id: any;
  email: string | any;
  username: string | any;
  phone: string | number | any;
  role: any;
  photoURL?: string;
  status?: string;
  created_at?: string;
  createdBy: string;
  pin?: string;
  permissions?: UserPermissions;
  organizationId?: number | string;
}

export interface UserRegistrationInterface extends DatabaseItemInterface {
  name: string;
  email: string;
  phone: string;
  username: string;
  photoURL?: string;
  createdBy: string;
  dateOfBirth: string | null;
}

export interface UserSessionInterface {
  user: UserInterface;
  token: string;
}

export interface SignupInterface {
  fullName: string;
  email: string;
  phone: string | number;
  password: string;
  confrimPassword: string;
  permissions?: PermissionInterface;
  organization: string;
}
