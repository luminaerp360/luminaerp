export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export interface Customer {
  fullName: string;
  id?: number;
  isActive?: boolean;
  dueCredit?: number;
  phoneNumber: string;
  email?: string;
  customerType?: CustomerType;
  kraPin?: string;
}
