export interface Payment {
  id: number;
  contract: {
    id: number;
    property: {
      id: number;
      title: string;
      address: string;
    };
    tenant: {
      id: number;
      name: string;
      email: string;
    };
  };
  amount: number;
  payment_date: string | null;
  due_date: string;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
}

export type PaymentFormData = Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'contract'> & {
  contract_id: number;
}; 