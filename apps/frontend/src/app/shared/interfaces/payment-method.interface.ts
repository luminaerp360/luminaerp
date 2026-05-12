export interface PaymentMethodConfig {
  id: number;
  organizationId: number;
  settingsId: number;
  name: string;
  code: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
  requiresReference: boolean;
  autoReconcile: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePaymentMethodDto {
  organizationId: number;
  settingsId: number;
  name: string;
  code: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  sortOrder?: number;
  requiresReference?: boolean;
  autoReconcile?: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
}

export interface UpdatePaymentMethodDto {
  name?: string;
  code?: string;
  displayName?: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  sortOrder?: number;
  requiresReference?: boolean;
  autoReconcile?: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
}
