import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { useAuth } from './useAuth';

export const usePayments = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Transacciones
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {

try {
        const result = await paymentService.getTransactions();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener transacciones:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Métodos de pago
  const { data: paymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {

try {
        const result = await paymentService.getPaymentMethods();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener métodos de pago:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Facturas
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {

try {
        const result = await paymentService.getInvoices();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener facturas:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Cuentas escrow
  const { data: escrowAccounts } = useQuery({
    queryKey: ['escrowAccounts'],
    queryFn: async () => {

try {
        const result = await paymentService.getEscrowAccounts();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener cuentas escrow:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Planes de pago
  const { data: paymentPlans } = useQuery({
    queryKey: ['paymentPlans'],
    queryFn: async () => {

try {
        const result = await paymentService.getPaymentPlans();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener planes de pago:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Cuotas
  const { data: installments } = useQuery({
    queryKey: ['installments'],
    queryFn: async () => {

try {
        const result = await paymentService.getInstallments();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener cuotas:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Balance
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {

try {
        const result = await paymentService.getBalance();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener balance:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Estadísticas dashboard
  const { data: dashboardStats } = useQuery({
    queryKey: ['payment-dashboard-stats'],
    queryFn: async () => {

try {
        const result = await paymentService.getPaymentDashboardStats();

return result;
      } catch (error: any) {
        console.error('❌ usePayments: Error al obtener estadísticas:', error.response?.status, error.response?.data);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Mutaciones para transacciones
  const createTransaction = useMutation({
    mutationFn: paymentService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard-stats'] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard-stats'] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: paymentService.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard-stats'] });
    },
  });

  // Mutaciones para métodos de pago
  const createPaymentMethod = useMutation({
    mutationFn: paymentService.createPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updatePaymentMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const deletePaymentMethod = useMutation({
    mutationFn: paymentService.deletePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const addPaymentMethod = useMutation({
    mutationFn: paymentService.addPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const verifyPaymentMethod = useMutation({
    mutationFn: ({ id, verificationData }: { id: string; verificationData: any }) =>
      paymentService.verifyPaymentMethod(id, verificationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const setDefaultPaymentMethod = useMutation({
    mutationFn: paymentService.setDefaultPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  // Mutaciones para facturas
  const createInvoice = useMutation({
    mutationFn: paymentService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: paymentService.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const createInvoiceCustom = useMutation({
    mutationFn: paymentService.createInvoiceCustom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const payInvoice = useMutation({
    mutationFn: ({ id, paymentData }: { id: string; paymentData: any }) =>
      paymentService.payInvoice(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  const sendInvoice = useMutation({
    mutationFn: ({ id, sendData }: { id: string; sendData: any }) =>
      paymentService.sendInvoice(id, sendData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Mutaciones para escrow
  const createEscrowAccount = useMutation({
    mutationFn: paymentService.createEscrowAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowAccounts'] });
    },
  });

  const updateEscrowAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updateEscrowAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowAccounts'] });
    },
  });

  const deleteEscrowAccount = useMutation({
    mutationFn: paymentService.deleteEscrowAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowAccounts'] });
    },
  });

  const depositToEscrow = useMutation({
    mutationFn: ({ id, fundData }: { id: string; fundData: any }) =>
      paymentService.fundEscrow(id, fundData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  const releaseFromEscrow = useMutation({
    mutationFn: ({ id, releaseData }: { id: string; releaseData: any }) =>
      paymentService.releaseEscrow(id, releaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  // Mutaciones para planes de pago
  const createPaymentPlan = useMutation({
    mutationFn: paymentService.createPaymentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] });
    },
  });

  const updatePaymentPlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updatePaymentPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] });
    },
  });

  const deletePaymentPlan = useMutation({
    mutationFn: paymentService.deletePaymentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] });
    },
  });

  // Mutaciones para cuotas
  const createInstallment = useMutation({
    mutationFn: paymentService.createInstallment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });

  const updateInstallment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updateInstallment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });

  const deleteInstallment = useMutation({
    mutationFn: paymentService.deleteInstallment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });

  const payInstallment = useMutation({
    mutationFn: (paymentData: any) =>
      paymentService.processPayment(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  return {
    // Datos
    transactions,
    paymentMethods,
    invoices,
    escrowAccounts,
    paymentPlans,
    installments,
    balance,
    dashboardStats,
    
    // Estados
    isLoading,
    error,
    
    // Mutaciones de transacciones
    createTransaction,
    updateTransaction,
    deleteTransaction,
    
    // Mutaciones de métodos de pago
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addPaymentMethod,
    verifyPaymentMethod,
    setDefaultPaymentMethod,
    
    // Mutaciones de facturas
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createInvoiceCustom,
    payInvoice,
    sendInvoice,
    
    // Mutaciones de escrow
    createEscrowAccount,
    updateEscrowAccount,
    deleteEscrowAccount,
    depositToEscrow,
    releaseFromEscrow,
    
    // Mutaciones de planes de pago
    createPaymentPlan,
    updatePaymentPlan,
    deletePaymentPlan,
    
    // Mutaciones de cuotas
    createInstallment,
    updateInstallment,
    deleteInstallment,
    payInstallment,
  };
}; 