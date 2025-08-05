import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Chip,
  Avatar,
  Button,
  Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ratingService } from '../../services/ratingService';

export const RatingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rating, isLoading, error } = useQuery({
    queryKey: ['rating', id],
    queryFn: () => ratingService.getRating(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <Typography>Cargando...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error al cargar la calificación</Typography>;
  }

  if (!rating) {
    return <Typography>Calificación no encontrada</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Detalles de Calificación
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/app/ratings')}
        >
          Volver
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar>{rating.reviewer?.name?.[0] || 'U'}</Avatar>
            <Box>
              <Typography variant="h6">
                {rating.reviewer?.name || 'Usuario'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Calificado por: {rating.reviewee?.name || 'Usuario'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box mb={3}>
            <Typography component="legend" variant="h6" gutterBottom>
              Calificación General
            </Typography>
            <Rating
              value={rating.overall_rating || 0}
              readOnly
              size="large"
            />
            <Typography variant="body1" mt={2}>
              {rating.comment || 'Sin comentarios'}
            </Typography>
          </Box>

          <Box mb={3}>
            <Chip
              label={rating.rating_type || 'General'}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Creado el: {new Date(rating.created_at).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}; 