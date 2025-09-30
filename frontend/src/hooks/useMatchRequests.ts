/**
 * Hook personalizado para gestionar Match Requests
 * Integra completamente con el sistema de matching del backend
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchingService, MatchRequest, MatchStatistics, DashboardData } from '../services/matchingService';
import { useAuth } from './useAuth';

export interface UseMatchRequestsReturn {
  // Data
  matchRequests: MatchRequest[];
  sentRequests: MatchRequest[];
  receivedRequests: MatchRequest[];
  statistics: MatchStatistics | null;
  dashboardData: DashboardData | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingSent: boolean;
  isLoadingReceived: boolean;
  isLoadingStats: boolean;
  
  // Error states
  error: Error | null;
  
  // Actions
  markAsViewed: (id: string) => Promise<void>;
  acceptRequest: (id: string, message?: string) => Promise<void>;
  rejectRequest: (id: string, message?: string) => Promise<void>;
  createMatchRequest: (data: any) => Promise<void>;
  getCompatibility: (id: string) => Promise<any>;
  refetchMatchRequests: () => Promise<any>;
  
  // UI helpers
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityText: (priority: string) => string;
  formatCurrency: (amount: number | null) => string;
  isExpired: (expiresAt: string) => boolean;
  isExpiringSoon: (expiresAt: string) => boolean;
}

export const useMatchRequests = (): UseMatchRequestsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Query keys
  const matchRequestsKey = ['matchRequests', user?.id];
  const statisticsKey = ['matchStatistics', user?.id];
  const dashboardKey = ['matchDashboard', user?.id];

  // Main match requests query (role-based)
  const { 
    data: matchRequestsResponse, 
    isLoading,
    error: requestsError,
    refetch: refetchMatchRequests
  } = useQuery({
    queryKey: matchRequestsKey,
    queryFn: async () => {
      const response = await matchingService.getMyMatchRequests();
      console.log('🔍 API Response completa:', response);
      console.log('🔍 API Response.data:', response?.data);
      console.log('🔍 API Response.data.results:', response?.data?.results);
      return response;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Ensure matchRequests is always an Array - Check for paginated response
  const matchRequests = Array.isArray(matchRequestsResponse?.data?.results) 
    ? matchRequestsResponse.data.results  // Paginated response
    : Array.isArray(matchRequestsResponse?.data) 
      ? matchRequestsResponse.data  // Direct array
      : Array.isArray(matchRequestsResponse) 
        ? matchRequestsResponse  // Response is array itself
        : [];
  
  console.log('🔍 matchRequests procesado:', matchRequests);

  // Statistics query
  const { 
    data: statisticsResponse, 
    isLoading: isLoadingStats,
    error: statsError 
  } = useQuery({
    queryKey: statisticsKey,
    queryFn: async () => {
      const response = await matchingService.getMatchStatistics();
      console.log('📊 Statistics Response:', response);
      return response;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });
  
  const statistics = statisticsResponse?.data || statisticsResponse || null;

  // Dashboard data query
  const { 
    data: dashboardResponse,
    error: dashboardError 
  } = useQuery({
    queryKey: dashboardKey,
    queryFn: async () => {
      const response = await matchingService.getDashboardData();
      console.log('📈 Dashboard Response:', response);
      return response;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  
  const dashboardData = dashboardResponse?.data || dashboardResponse || null;

  // Separate sent and received requests based on user role
  console.log('🔍 User info:', { 
    id: user?.id, 
    email: user?.email, 
    user_type: user?.user_type 
  });
  const sentRequests = user?.user_type === 'tenant' ? matchRequests : [];
  const receivedRequests = user?.user_type === 'landlord' ? matchRequests : [];

  // Update error state
  useEffect(() => {
    const firstError = requestsError || statsError || dashboardError;
    setError(firstError);
  }, [requestsError, statsError, dashboardError]);

  // Mark as viewed mutation
  const markViewedMutation = useMutation({
    mutationFn: (id: string) => matchingService.markMatchRequestViewed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchRequestsKey });
      queryClient.invalidateQueries({ queryKey: statisticsKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (err) => setError(err as Error),
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => 
      matchingService.acceptMatchRequest(id, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchRequestsKey });
      queryClient.invalidateQueries({ queryKey: statisticsKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (err) => setError(err as Error),
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => 
      matchingService.rejectMatchRequest(id, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchRequestsKey });
      queryClient.invalidateQueries({ queryKey: statisticsKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (err) => setError(err as Error),
  });

  // Create match request mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => matchingService.createMatchRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchRequestsKey });
      queryClient.invalidateQueries({ queryKey: statisticsKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (err) => setError(err as Error),
  });

  // Action methods
  const markAsViewed = async (id: string) => {
    await markViewedMutation.mutateAsync(id);
  };

  const acceptRequest = async (id: string, message?: string) => {
    await acceptMutation.mutateAsync({ id, message });
  };

  const rejectRequest = async (id: string, message?: string) => {
    await rejectMutation.mutateAsync({ id, message });
  };

  const createMatchRequest = async (data: any) => {
    await createMutation.mutateAsync(data);
  };

  const getCompatibility = async (id: string) => {
    try {
      const response = await matchingService.getMatchCompatibility(id);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // UI Helper methods (using service utilities)
  const getStatusColor = (status: string) => matchingService.getMatchStatusColor(status);
  const getStatusText = (status: string) => matchingService.getMatchStatusText(status);
  const getPriorityColor = (priority: string) => matchingService.getPriorityColor(priority);
  const getPriorityText = (priority: string) => matchingService.getPriorityText(priority);
  const formatCurrency = (amount: number | null) => matchingService.formatCurrency(amount);
  
  const isExpired = (expiresAt: string): boolean => {
    return matchingService.calculateDaysUntilExpiry(expiresAt) !== null && 
           matchingService.calculateDaysUntilExpiry(expiresAt)! <= 0;
  };
  
  const isExpiringSoon = (expiresAt: string): boolean => {
    return matchingService.isMatchExpiringSoon(expiresAt);
  };

  return {
    // Data
    matchRequests,
    sentRequests,
    receivedRequests,
    statistics,
    dashboardData,
    
    // Loading states
    isLoading,
    isLoadingSent: isLoading,
    isLoadingReceived: isLoading,
    isLoadingStats,
    
    // Error states
    error,
    
    // Actions
    markAsViewed,
    acceptRequest,
    rejectRequest,
    createMatchRequest,
    getCompatibility,
    refetchMatchRequests,
    
    // UI helpers
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    formatCurrency,
    isExpired,
    isExpiringSoon,
  };
};

export default useMatchRequests;