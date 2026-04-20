import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingService } from '../services/ratingService';
import { useAuth } from './useAuth';

export const useRatings = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: ratings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ratings'],
    queryFn: ratingService.getRatings,
    retry: 3,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  const createRating = useMutation({
    mutationFn: ratingService.createRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
    onError: error => {},
  });

  const updateRating = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ratingService.updateRating(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
    onError: error => {},
  });

  const deleteRating = useMutation({
    mutationFn: ratingService.deleteRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
    onError: error => {},
  });

  return {
    ratings,
    isLoading,
    error,
    createRating,
    updateRating,
    deleteRating,
  };
};
