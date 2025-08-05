import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Rating as MuiRating,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { MoreVert as MoreVertIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRatings } from '../../hooks/useRatings';
import { ensureArray } from '../../utils/arrayUtils';
import { Rating } from '../../types/rating';

export const RatingList: React.FC = () => {
  const navigate = useNavigate();
  const { ratings, isLoading, error, deleteRating } = useRatings();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedRating, setSelectedRating] = React.useState<Rating | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rating: Rating) => {
    setAnchorEl(event.currentTarget);
    setSelectedRating(rating);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRating(null);
  };

  const handleView = () => {
    if (selectedRating) {
      navigate(`/ratings/${selectedRating.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedRating) {
      deleteRating(selectedRating.id);
    }
    handleMenuClose();
  };

  // Asegurar que ratings sea un array
  const ratingsArray = ensureArray(ratings) as Rating[];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error al cargar las calificaciones: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Calificaciones
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/ratings/new')}
        >
          Nueva Calificación
        </Button>
      </Box>

      {ratingsArray.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No hay calificaciones
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {ratingsArray.map((rating) => (
            <Grid item xs={12} sm={6} md={4} key={rating.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar>{rating.reviewer?.name?.[0] || 'U'}</Avatar>
                      <Box>
                        <Typography variant="h6" component="div">
                          {rating.reviewer?.name || 'Usuario'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Calificado por: {rating.reviewee?.name || 'Usuario'}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, rating)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Box mt={2}>
                    <MuiRating
                      value={rating.overall_rating || 0}
                      readOnly
                      precision={0.5}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {rating.comment || 'Sin comentarios'}
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <Chip
                      label={rating.rating_type || 'General'}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'Fecha desconocida'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>Ver Detalles</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
    </Box>
  );
}; 