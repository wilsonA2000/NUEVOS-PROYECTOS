import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Avatar,
  Grid,
  Chip,
  Skeleton,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Star as StarIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import api from '../../services/api';

export interface ReviewsListProps {
  targetType: 'user' | 'property' | 'service';
  targetId: string;
  showStats?: boolean;
}

interface Review {
  id: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar?: string;
    is_verified?: boolean;
  };
  overall_rating: number;
  communication_rating?: number;
  service_quality_rating?: number;
  cleanliness_rating?: number;
  value_rating?: number;
  location_rating?: number;
  comment: string;
  created_at: string;
  is_verified_review: boolean;
}

interface RatingStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

const ReviewsList: React.FC<ReviewsListProps> = ({
  targetType,
  targetId,
  showStats = true,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const reviewsPerPage = 10;

  useEffect(() => {
    loadReviews();
  }, [targetType, targetId, page]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        target_type: targetType,
        target_id: targetId,
        page: page.toString(),
        page_size: reviewsPerPage.toString(),
      });
      // BUG-FE-RAT-01: URL correcta es /ratings/ratings/ (el router DRF usa
      // 'ratings' como basename). /ratings/ devolvía el APIRoot de DRF.
      const response = await api.get(`/ratings/ratings/?${params}`);

      // BUG-FE-RAT-02: validar que la respuesta sea array antes de setear,
      // si no el .map() crashea. Soporta respuestas paginadas y planas.
      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];
      setReviews(list);

      // BUG-FE-RAT-03: usar 'list.length' recién calculado en vez del stale
      // 'reviews.length' del render previo para calcular totalPages.
      const totalCount =
        typeof data.count === 'number' ? data.count : list.length;
      setTotalPages(Math.max(1, Math.ceil(totalCount / reviewsPerPage)));

      if (showStats) {
        const statsRes = await api.get(
          `/ratings/stats/?target_type=${targetType}&target_id=${targetId}`,
        );
        setStats(statsRes.data);
      }
      setError(null);
    } catch (err: any) {
      setError('Error al cargar calificaciones');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box>
        {[1, 2, 3].map(n => (
          <Card key={n} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant='circular' width={48} height={48} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width='40%' height={24} />
                  <Skeleton width='30%' height={20} sx={{ mt: 1 }} />
                  <Skeleton width='100%' height={60} sx={{ mt: 2 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>;
  }

  return (
    <Box>
      {showStats && stats && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                <Typography variant='h2' fontWeight='bold' color='primary'>
                  {stats.average_rating.toFixed(1)}
                </Typography>
                <Rating
                  value={stats.average_rating}
                  readOnly
                  precision={0.1}
                  size='large'
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  {stats.total_reviews} calificacion
                  {stats.total_reviews !== 1 ? 'es' : ''}
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant='h6' gutterBottom>
                  Distribución de Calificaciones
                </Typography>
                {[5, 4, 3, 2, 1].map(rating => (
                  <Box
                    key={rating}
                    sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                  >
                    <Typography variant='body2' sx={{ width: 80 }}>
                      {rating} estrellas
                    </Typography>
                    <Box
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        mx: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${((stats.rating_breakdown[rating as keyof typeof stats.rating_breakdown] || 0) / stats.total_reviews) * 100}%`,
                          bgcolor: 'warning.main',
                        }}
                      />
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ width: 40, textAlign: 'right' }}
                    >
                      {stats.rating_breakdown[
                        rating as keyof typeof stats.rating_breakdown
                      ] || 0}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {reviews.length === 0 ? (
        <Alert severity='info'>
          No hay calificaciones aún. Sé el primero en dejar una opinión.
        </Alert>
      ) : (
        <>
          {reviews.map(review => (
            <Card key={review.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={review.reviewer.avatar}
                    sx={{ width: 48, height: 48 }}
                  >
                    {review.reviewer.full_name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant='subtitle1' fontWeight='medium'>
                        {review.reviewer.full_name}
                      </Typography>
                      {review.reviewer.is_verified && (
                        <Chip
                          icon={<VerifiedIcon />}
                          label='Verificado'
                          size='small'
                          color='success'
                          variant='outlined'
                        />
                      )}
                      {review.is_verified_review && (
                        <Chip
                          label='Reseña Verificada'
                          size='small'
                          color='primary'
                          variant='outlined'
                        />
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Rating
                        value={review.overall_rating}
                        readOnly
                        size='small'
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(review.created_at)}
                      </Typography>
                    </Box>
                    {review.comment && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        paragraph
                      >
                        {review.comment}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {review.communication_rating && (
                        <Chip
                          label={`Comunicación: ${review.communication_rating}★`}
                          size='small'
                          variant='outlined'
                        />
                      )}
                      {review.service_quality_rating && (
                        <Chip
                          label={`Calidad: ${review.service_quality_rating}★`}
                          size='small'
                          variant='outlined'
                        />
                      )}
                      {review.cleanliness_rating && (
                        <Chip
                          label={`Limpieza: ${review.cleanliness_rating}★`}
                          size='small'
                          variant='outlined'
                        />
                      )}
                      {review.value_rating && (
                        <Chip
                          label={`Valor: ${review.value_rating}★`}
                          size='small'
                          variant='outlined'
                        />
                      )}
                      {review.location_rating && (
                        <Chip
                          label={`Ubicación: ${review.location_rating}★`}
                          size='small'
                          variant='outlined'
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color='primary'
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ReviewsList;
