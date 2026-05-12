import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Permission Service
 * Manages user permissions for modules and CRUD operations
 * Integrates with the existing localStorage-based permission system
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  constructor() {}

  /**
   * Get all user permissions from localStorage
   * @returns User permissions object or empty object if not found
   */
  getPermissions(): any {
    try {
      const storedPermissions = localStorage.getItem('userPermision');
      if (storedPermissions) {
        return JSON.parse(storedPermissions);
      }
    } catch (error) {
      console.error('Error parsing user permissions:', error);
    }
    return {};
  }

  /**
   * Check if user has access to a specific module
   * Handles both boolean permissions (e.g., lpo: true) and
   * object permissions with granular actions (e.g., products: {create: true, edit: true, ...})
   * @param module - Module name (e.g., 'sales', 'products', 'inventory')
   * @returns true if user has access to the module
   */
  hasModuleAccess(module: string): boolean {
    const permissions = this.getPermissions();
    const modulePermission = permissions[module];

    // Module permission can be:
    // - true (simple boolean access)
    // - an object with granular actions (e.g., {create: true, edit: true, view: true})
    // - false or undefined (no access)
    if (modulePermission === true) {
      return true;
    }
    if (
      modulePermission &&
      typeof modulePermission === 'object' &&
      !Array.isArray(modulePermission)
    ) {
      // Has access if the object has at least one truthy action
      return Object.values(modulePermission).some((v) => v === true);
    }
    return false;
  }

  /**
   * Check if user can perform a specific action on a module
   * Checks granular module-level permissions first, then falls back to global CRUD permissions
   * @param module - Module name (e.g., 'sales', 'products', 'inventory')
   * @param action - Action to perform ('create', 'update', 'delete', 'view')
   * @returns true if user can perform the action
   */
  canPerformAction(
    module: string,
    action: 'create' | 'update' | 'delete' | 'view',
  ): boolean {
    const permissions = this.getPermissions();

    // First check if user has module access
    const hasAccess = this.hasModuleAccess(module);
    if (!hasAccess) {
      return false;
    }

    const modulePermission = permissions[module];

    // If module permission is an object, check granular action within it
    if (
      modulePermission &&
      typeof modulePermission === 'object' &&
      !Array.isArray(modulePermission)
    ) {
      // Map the action name to the key used in the granular permission object
      // The permission objects use 'edit' instead of 'update'
      const granularActionMap: Record<string, string> = {
        create: 'create',
        update: 'edit',
        delete: 'delete',
        view: 'view',
      };
      const granularKey = granularActionMap[action];
      if (modulePermission[granularKey] === true) {
        return true;
      }
    }

    // Fall back to global CRUD permissions
    const globalActionMap: Record<string, string> = {
      create: 'canCreate',
      update: 'canUpdate',
      delete: 'canDelete',
      view: 'canView',
    };
    const permissionKey = globalActionMap[action];
    return permissions[permissionKey] === true;
  }

  /**
   * Observable version of canPerformAction
   * Used in templates with async pipe
   * @param module - Module name
   * @param action - Action to perform
   * @returns Observable<boolean>
   */
  canPerformAction$(
    module: string,
    action: 'create' | 'update' | 'delete' | 'view',
  ): Observable<boolean> {
    const result = this.canPerformAction(module, action);
    return of(result);
  }

  /**
   * Check if user has a specific named permission
   * @param permission - Permission name (e.g., 'sales', 'dashboard', 'reports')
   * @returns Observable<boolean>
   */
  hasPermission(permission: string): Observable<boolean> {
    const permissions = this.getPermissions();
    const hasPermission = permissions ? !!permissions[permission] : false;
    return of(hasPermission);
  }

  /**
   * Check if user has a specific named permission (synchronous)
   * @param permission - Permission name
   * @returns boolean
   */
  hasPermissionSync(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions ? !!permissions[permission] : false;
  }

  /**
   * Check if user has ALL of the specified permissions
   * @param requiredPermissions - Array of permission names
   * @returns true if user has all permissions
   */
  hasAllPermissions(requiredPermissions: string[]): boolean {
    return requiredPermissions.every((perm) => this.hasModuleAccess(perm));
  }

  /**
   * Check if user has ANY of the specified permissions
   * @param requiredPermissions - Array of permission names
   * @returns true if user has at least one permission
   */
  hasAnyPermission(requiredPermissions: string[]): boolean {
    return requiredPermissions.some((perm) => this.hasModuleAccess(perm));
  }

  /**
   * Check if user is an admin (has all permissions)
   * @returns true if user has admin privileges
   */
  isAdmin(): boolean {
    const permissions = this.getPermissions();

    // Check global CRUD permissions (these are always boolean)
    const globalPerms = ['canDelete', 'canUpdate', 'canCreate', 'canView'];
    const hasGlobalPerms = globalPerms.every(
      (perm) => permissions[perm] === true,
    );

    // Check critical module permissions (can be boolean or object)
    const modulePerms = ['users', 'setting'];
    const hasModulePerms = modulePerms.every((perm) =>
      this.hasModuleAccess(perm),
    );

    return hasGlobalPerms && hasModulePerms;
  }

  /**
   * Get user role from localStorage
   * @returns User role string or null
   */
  getUserRole(): string | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.role || null;
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
    return null;
  }

  /**
   * Check if user has a specific role
   * @param role - Role name (e.g., 'ADMIN', 'SALES', 'SUPER_ADMIN')
   * @returns true if user has the specified role
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    // Case-insensitive comparison
    return userRole.toLowerCase() === role.toLowerCase();
  }

  /**
   * Debug method to log all permissions (useful for troubleshooting)
   */
  debugPermissions(): void {
    const permissions = this.getPermissions();
    const role = this.getUserRole();

    console.log('=== Permission Debug Info ===');
    console.log('User Role:', role);
    console.log('All Permissions:', permissions);
    console.log('Is Admin:', this.isAdmin());
    console.log('===========================');
  }
}
