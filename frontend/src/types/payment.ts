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
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentDto {
  contract_id: number;
  amount: number;
  due_date: string;
  payment_method: string;
  notes?: string;
}

export interface UpdatePaymentDto {
  status?: 'pending' | 'paid' | 'overdue' | 'failed';
  payment_date?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}

export interface PaymentFilters {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  contract_id?: number;
} 