import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import requestService, { 
  BaseRequest, 
  PropertyInterestRequest, 
  ServiceRequest, 
  MaintenanceRequest,
  ContractSignatureRequest,
  CreatePropertyInterestData,
  CreateServiceRequestData,
  CreateMaintenanceRequestData,
  RequestActionData 
} from '../services/requestService';

export const useRequests = () => {
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const response = await requestService.getMyRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: sentRequests = [],
    isLoading: sentRequestsLoading,
    refetch: refetchSentRequests
  } = useQuery({
    queryKey: ['requests', 'sent'],
    queryFn: async () => {
      const response = await requestService.getMySentRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: receivedRequests = [],
    isLoading: receivedRequestsLoading,
    refetch: refetchReceivedRequests
  } = useQuery({
    queryKey: ['requests', 'received'],
    queryFn: async () => {
      const response = await requestService.getMyReceivedRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['requests', 'stats'],
    queryFn: async () => {
      const response = await requestService.getDashboardStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const refetchAll = useCallback(() => {
    refetchRequests();
    refetchSentRequests();
    refetchReceivedRequests();
    refetchStats();
  }, [refetchRequests, refetchSentRequests, refetchReceivedRequests, refetchStats]);

  return {
    requests,
    sentRequests,
    receivedRequests,
    stats,
    isLoading: requestsLoading || sentRequestsLoading || receivedRequestsLoading || statsLoading,
    error: requestsError,
    refetch: refetchAll
  };
};

export const usePropertyInterestRequests = () => {
  const queryClient = useQueryClient();

  const {
    data: propertyInterests = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', 'property-interest'],
    queryFn: async () => {
      const response = await requestService.getPropertyInterestRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createPropertyInterestMutation = useMutation({
    mutationFn: (data: CreatePropertyInterestData) => 
      requestService.createPropertyInterestRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'property-interest'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'stats'] });
    },
  });

  return {
    propertyInterests,
    isLoading,
    error,
    refetch,
    createPropertyInterest: createPropertyInterestMutation.mutateAsync,
    isCreating: createPropertyInterestMutation.isPending
  };
};

export const useServiceRequests = () => {
  const queryClient = useQueryClient();

  const {
    data: serviceRequests = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', 'services'],
    queryFn: async () => {
      const response = await requestService.getServiceRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createServiceRequestMutation = useMutation({
    mutationFn: (data: CreateServiceRequestData) => 
      requestService.createServiceRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'stats'] });
    },
  });

  return {
    serviceRequests,
    isLoading,
    error,
    refetch,
    createServiceRequest: createServiceRequestMutation.mutateAsync,
    isCreating: createServiceRequestMutation.isPending
  };
};

export const useMaintenanceRequests = () => {
  const queryClient = useQueryClient();

  const {
    data: maintenanceRequests = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', 'maintenance'],
    queryFn: async () => {
      const response = await requestService.getMaintenanceRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMaintenanceRequestMutation = useMutation({
    mutationFn: (data: CreateMaintenanceRequestData) => 
      requestService.createMaintenanceRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'stats'] });
    },
  });

  return {
    maintenanceRequests,
    isLoading,
    error,
    refetch,
    createMaintenanceRequest: createMaintenanceRequestMutation.mutateAsync,
    isCreating: createMaintenanceRequestMutation.isPending
  };
};

export const useContractRequests = () => {
  const {
    data: contractRequests = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', 'contracts'],
    queryFn: async () => {
      const response = await requestService.getContractRequests();
      return response.data.results || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    contractRequests,
    isLoading,
    error,
    refetch
  };
};

export const useRequestActions = () => {
  const queryClient = useQueryClient();

  const performActionMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: RequestActionData }) =>
      requestService.performRequestAction(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'stats'] });
    },
  });

  const signContractMutation = useMutation({
    mutationFn: (requestId: string) =>
      requestService.signContract(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'contracts'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'stats'] });
    },
  });

  return {
    performAction: performActionMutation.mutateAsync,
    signContract: signContractMutation.mutateAsync,
    isPerformingAction: performActionMutation.isPending,
    isSigningContract: signContractMutation.isPending
  };
};

export const useRequestComments = (requestId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: comments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', requestId, 'comments'],
    queryFn: async () => {
      if (!requestId) return [];
      const response = await requestService.getRequestComments(requestId);
      return response.data.results || response.data;
    },
    enabled: !!requestId,
    staleTime: 2 * 60 * 1000,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ content, isInternal = false }: { content: string; isInternal?: boolean }) => {
      if (!requestId) throw new Error('Request ID is required');
      return requestService.addRequestComment(requestId, content, isInternal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId, 'comments'] });
    },
  });

  return {
    comments,
    isLoading,
    error,
    refetch,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending
  };
};

export const useRequestNotifications = () => {
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['request-notifications'],
    queryFn: async () => {
      const response = await requestService.getRequestNotifications();
      return response.data.results || response.data;
    },
    staleTime: 30 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      requestService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => requestService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-notifications'] });
    },
  });

  return {
    notifications,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending
  };
};

export const useRequestDetail = (requestId: string, requestType?: string) => {
  const {
    data: request,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', requestType, requestId],
    queryFn: async () => {
      let response;
      switch (requestType) {
        case 'property_interest':
          response = await requestService.getPropertyInterestRequest(requestId);
          break;
        case 'service_request':
          response = await requestService.getServiceRequest(requestId);
          break;
        case 'maintenance_request':
          response = await requestService.getMaintenanceRequest(requestId);
          break;
        case 'contract_signature':
          response = await requestService.getContractRequest(requestId);
          break;
        default:
          response = await requestService.getRequest(requestId);
      }
      return response.data;
    },
    enabled: !!requestId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    request,
    isLoading,
    error,
    refetch
  };
};

export const useRequestStats = () => {
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requests', 'stats'],
    queryFn: async () => {
      const response = await requestService.getDashboardStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    stats,
    isLoading,
    error,
    refetch
  };
};