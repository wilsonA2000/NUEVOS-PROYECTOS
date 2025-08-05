import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  IconButton,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Bed as BedIcon,
  Bathtub as BathIcon,
  SquareFoot as AreaIcon,
  AttachMoney as PriceIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProperties } from '../../hooks/useProperties';
import { Property } from '../../types/property';
import ExportButton from '../../components/ExportButton';
import { ensureArray } from '../../utils/arrayUtils';
import { api } from '../../services/api';
import PropertyImage from '../../components/common/PropertyImage';

const PropertyList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { properties, isLoading, error, deleteProperty } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/app/properties/${id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPropertyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (propertyToDelete) {
      try {
        await deleteProperty.mutateAsync(propertyToDelete);
        setDeleteDialogOpen(false);
        setPropertyToDelete(null);
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };

  const handlePropertyClick = (property: Property) => {
    navigate(`/app/properties/${property.id}`);
  };

  const isLandlord = user?.user_type === 'landlord' || user?.user_type === 'admin';

  // Asegurar que properties sea un array
  const propertiesArray = ensureArray(properties);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">
          Error al cargar las propiedades: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Propiedades
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ExportButton type="properties" />
          {isAuthenticated && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/properties/new')}
            >
              Nueva Propiedad
            </Button>
          )}
        </Box>
      </Box>

      {propertiesArray.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography variant="body1" color="text.secondary">
            No se encontraron propiedades
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {propertiesArray.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handlePropertyClick(property)}
              >
                {property.images && property.images.length > 0 ? (
                  <PropertyImage
                    src={
                      property.main_image_url ||
                      (typeof property.images[0] === 'string' 
                        ? property.images[0] 
                        : property.images[0].image || property.images[0].image_url || property.images[0])
                    }
                    alt={property.title}
                    height={200}
                    objectFit="cover"
                    placeholder={true}
                    progressive={true}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#bdbdbd',
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <LocationIcon sx={{ fontSize: 48, mb: 1 }} />
                      <Typography variant="body2">Sin imagen</Typography>
                    </Box>
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {property.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {property.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.address}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary">
                      {property.formatted_price || 
                       (property.listing_type === 'rent' ? 
                         `$${property.rent_price?.toLocaleString()}/mes` : 
                         `$${property.sale_price?.toLocaleString()}`)}
                    </Typography>
                    <Chip label={property.status} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2">
                      {property.bedrooms} hab | {property.bathrooms} baños
                    </Typography>
                    <Typography variant="body2">
                      {property.total_area} m²
                    </Typography>
                  </Box>
                  {isAuthenticated && isLandlord && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleEdit(e, property.id)}
                        color="primary"
                        title="Editar propiedad"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteClick(e, property.id)}
                        color="error"
                        title="Eliminar propiedad"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteProperty.isPending}
          >
            {deleteProperty.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyList;
export { PropertyList }; 