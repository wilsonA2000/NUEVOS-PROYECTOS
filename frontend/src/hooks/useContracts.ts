import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import contractService from '../services/contractService';
import { Contract, CreateContractDto, UpdateContractDto } from '../types/contract';
import { useAuth } from './useAuth';

export const useContracts = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Contratos básicos
  const { data: contracts, isLoading, error } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      try {
        const result = await contractService.getContracts();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // Plantillas
  const { data: templates } = useQuery<any[]>({
    queryKey: ['contract-templates'],
    queryFn: contractService.getTemplates,
    enabled: isAuthenticated,
  });

  // Firmas
  const { data: signatures } = useQuery<any[]>({
    queryKey: ['contract-signatures'],
    queryFn: contractService.getSignatures,
    enabled: isAuthenticated,
  });

  // Enmiendas
  const { data: amendments } = useQuery<any[]>({
    queryKey: ['contract-amendments'],
    queryFn: contractService.getAmendments,
    enabled: isAuthenticated,
  });

  // Renovaciones
  const { data: renewals } = useQuery<any[]>({
    queryKey: ['contract-renewals'],
    queryFn: contractService.getRenewals,
    enabled: isAuthenticated,
  });

  // Terminaciones
  const { data: terminations } = useQuery<any[]>({
    queryKey: ['contract-terminations'],
    queryFn: contractService.getTerminations,
    enabled: isAuthenticated,
  });

  // Documentos
  const { data: documents } = useQuery({
    queryKey: ['contract-documents'],
    queryFn: contractService.getDocuments,
    enabled: isAuthenticated,
  });

  // Reportes
  const { data: expiringContracts } = useQuery({
    queryKey: ['expiring-contracts'],
    queryFn: contractService.getExpiringContracts,
    enabled: isAuthenticated,
  });

  const { data: pendingSignatures } = useQuery({
    queryKey: ['pending-signatures'],
    queryFn: contractService.getPendingSignatures,
    enabled: isAuthenticated,
  });

  // Estadísticas
  const { data: contractStats } = useQuery({
    queryKey: ['contract-stats'],
    queryFn: contractService.getContractStats,
    enabled: isAuthenticated,
  });

  // Mutaciones para contratos
  const createContract = useMutation<Contract, Error, CreateContractDto>({
    mutationFn: contractService.createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  const updateContract = useMutation<Contract, Error, { id: string; data: UpdateContractDto }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractDto }) =>
      contractService.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  const deleteContract = useMutation<void, Error, string>({
    mutationFn: contractService.deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  // Mutaciones para plantillas
  const createTemplate = useMutation({
    mutationFn: contractService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      contractService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: contractService.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });

  // Mutaciones para firmas
  const createSignature = useMutation({
    mutationFn: contractService.createSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
    },
  });

  const signContract = useMutation({
    mutationFn: ({ contractId, signatureData }: { contractId: string; signatureData: any }) =>
      contractService.signContract(contractId, signatureData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
    },
  });

  const verifySignature = useMutation({
    mutationFn: ({ contractId, verificationData }: { contractId: string; verificationData: any }) =>
      contractService.verifySignature(contractId, verificationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-signatures'] });
    },
  });

  // Mutaciones para estados del contrato
  const activateContract = useMutation({
    mutationFn: contractService.activateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  const suspendContract = useMutation({
    mutationFn: contractService.suspendContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  // Mutaciones para enmiendas
  const createAmendment = useMutation({
    mutationFn: contractService.createAmendment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments'] });
    },
  });

  // Mutaciones para renovaciones
  const createRenewal = useMutation({
    mutationFn: contractService.createRenewal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-renewals'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  // Mutaciones para terminaciones
  const createTermination = useMutation({
    mutationFn: contractService.createTermination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-terminations'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  // Mutaciones para documentos
  const uploadDocument = useMutation({
    mutationFn: ({ contractId, documentData }: { contractId: string; documentData: FormData }) =>
      contractService.uploadDocument(contractId, documentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
    },
  });

  return {
    // Datos
    contracts,
    templates,
    signatures,
    amendments,
    renewals,
    terminations,
    documents,
    expiringContracts,
    pendingSignatures,
    contractStats,
    
    // Estados
    isLoading,
    error,
    
    // Mutaciones
    createContract,
    updateContract,
    deleteContract,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createSignature,
    signContract,
    verifySignature,
    activateContract,
    suspendContract,
    createAmendment,
    createRenewal,
    createTermination,
    uploadDocument,
  };
}; 