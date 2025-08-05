/**
 * PropertyCards component
 * Mobile card view for properties - extracted from PropertyList.tsx
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Button,
  CardActions,
  Pagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Bathtub as BathtubIcon,
} from '@mui/icons-material';
import { Property } from '../../types/property';
import PropertyImage from '../common/PropertyImage';

interface PropertyCardsProps {
  properties: Property[];
  page: number;
  totalPages: number;
  onPageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  userType: string;
}

const PropertyCards: React.FC<PropertyCardsProps> = ({
  properties,
  page,
  totalPages,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  userType,
}) => {
  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' => {
    switch (status) {
      case 'available':
        return 'success';
      case 'rented':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'sold':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'rented':
        return 'Arrendada';
      case 'maintenance':
        return 'Mantenimiento';
      case 'sold':
        return 'Vendida';
      default:
        return status;
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (properties.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No se encontraron propiedades
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Intenta ajustar los filtros o buscar con otros términos
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {properties.map((property) => (
          <Grid item xs={12} sm={6} md={4} key={property.id}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* Image */}
              <Box sx={{ position: 'relative', height: 200 }}>
                <PropertyImage
                  src={
                    property.images && property.images.length > 0 
                      ? (typeof property.images[0] === 'string' 
                          ? property.images[0] 
                          : property.images[0].image || property.images[0])
                      : '/placeholder-property.jpg'
                  }
                  alt={property.title}
                  width="100%"
                  height={200}
                  style={{ objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => onView(property.id.toString())}
                />
                
                {/* Status Badge */}
                <Chip
                  label={getStatusText(property.status)}
                  color={getStatusColor(property.status)}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                />

                {/* Favorite Button */}
                {userType === 'tenant' && (
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                      },
                    }}
                    size="small"
                    onClick={() => onToggleFavorite(property.id.toString())}
                  >
                    {property.is_favorite ? (
                      <FavoriteIcon fontSize="small" color="error" />
                    ) : (
                      <FavoriteBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </Box>

              {/* Content */}
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Title and Price */}
                <Typography
                  variant="h6"
                  component="h3"
                  gutterBottom
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {property.title}
                </Typography>

                <Typography
                  variant="h5"
                  color="primary"
                  sx={{ fontWeight: 'bold', mb: 1 }}
                >
                  {formatPrice(property.rent_price || property.sale_price || 0)}
                  {property.price_type === 'rent' && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      /mes
                    </Typography>
                  )}
                </Typography>

                {/* Location */}
                <Box display="flex" alignItems="center" mb={1}>
                  <LocationIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {property.city}
                  </Typography>
                </Box>

                {/* Property Details */}
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Box display="flex" alignItems="center">
                    <HomeIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {property.bedrooms} hab
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <BathtubIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {property.bathrooms} baños
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {property.total_area} m²
                  </Typography>
                </Box>

                {/* Property Type */}
                <Chip
                  label={property.property_type}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {property.description}
                </Typography>
              </CardContent>

              {/* Actions */}
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => onView(property.id.toString())}
                >
                  Ver Detalles
                </Button>

                {userType === 'landlord' && (
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(property.id.toString())}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(property.id.toString())}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={onPageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </>
  );
};

export default PropertyCards;