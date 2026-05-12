export interface UserOrganization {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
  role: string;
  permissions: any;
  isPrimary: boolean;
  hasAccess: boolean;
  lastAccessedAt?: Date;
}
