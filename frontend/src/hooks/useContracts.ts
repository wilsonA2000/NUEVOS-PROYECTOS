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

  // Note: Firmas, enmiendas, renovaciones, terminaciones y documentos específicos 
  // de contratos se consultan individualmente por contractId cuando sea necesario
  // Estos no deberían ser consultas globales

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

  // Nuevas funcionalidades para contratos colombianos desde matching
  const validateMatchForContract = useMutation({
    mutationFn: ({ matchId }: { matchId: string }) =>
      contractService.validateMatchForContract(matchId),
    onError: (error) => {
      console.error('Error validating match for contract:', error);
    },
  });

  const createContractFromMatch = useMutation({
    mutationFn: ({ matchId, contractData }: { matchId: string; contractData: any }) =>
      contractService.createContractFromMatch(matchId, contractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['match-requests'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });
    },
  });

  const verifyIdentityForContract = useMutation({
    mutationFn: ({ contractId, documents }: { contractId: string; documents: any }) =>
      contractService.verifyIdentityForContract(contractId, documents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const generateLegalClauses = useMutation({
    mutationFn: ({ contractId }: { contractId: string }) =>
      contractService.generateLegalClauses(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const downloadContractPDF = useMutation({
    mutationFn: ({ contractId }: { contractId: string }) =>
      contractService.downloadContractPDF(contractId),
  });

  const getContractMilestones = useMutation({
    mutationFn: ({ contractId }: { contractId: string }) =>
      contractService.getContractMilestones(contractId),
  });

  return {
    // Datos
    contracts,
    templates,
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
    
    // Nuevas funcionalidades para contratos colombianos
    validateMatchForContract,
    createContractFromMatch,
    verifyIdentityForContract,
    generateLegalClauses,
    downloadContractPDF,
    getContractMilestones,
  };
}; 
/* FORCE RELOAD 1754456937819 - USE_CONTRACTS_HOOK - Nuclear fix applied */
