import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface Property {
  id?: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  property_type: string;
  listing_type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  total_area: number;
  built_area?: number;
  lot_area?: number;
  parking_spaces: number;
  floors: number;
  floor_number?: number;
  year_built?: number;
  rent_price?: number;
  sale_price?: number;
  security_deposit?: number;
  maintenance_fee?: number;
  minimum_lease_term: number;
  maximum_lease_term?: number;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  furnished: boolean;
  utilities_included: string[];
  property_features: string[];
  nearby_amenities: string[];
  transportation: string[];
  available_from?: string;
  is_featured: boolean;
  is_active: boolean;
}

const PropertyForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(id);

const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'México',
    postal_code: '',
    property_type: 'apartment',
    listing_type: 'rent',
    status: 'available',
    bedrooms: 1,
    bathrooms: 1,
    half_bathrooms: 0,
    total_area: 0,
    parking_spaces: 0,
    floors: 1,
    minimum_lease_term: 12,
    pets_allowed: false,
    smoking_allowed: false,
    furnished: false,
    utilities_included: [],
    property_features: [],
    nearby_amenities: [],
    transportation: [],
    is_featured: false,
    is_active: true,
  });

  const { data: property, isLoading: loadingProperty } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: async () => {

const response = await api.get(`/properties/properties/${id}/`);
      return response.data;
    },
    enabled: isEditing && !!id,
  });

  useEffect(() => {
    if (property) {

setFormData(property);
    }
  }, [property]);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: Partial<Property>) => {

const response = await api.post('/properties/properties/', data);
      return response.data;
    },
    onSuccess: (data) => {

navigate('/app/properties');
    },
    onError: (error: any) => {
      console.error('❌ PropertyForm: Error creando propiedad:', error);
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<Property>) => {

const response = await api.put(`/properties/properties/${id}/`, data);
      return response.data;
    },
    onSuccess: (data) => {

navigate('/app/properties');
    },
    onError: (error: any) => {
      console.error('❌ PropertyForm: Error actualizando propiedad:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

if (isEditing) {
      updatePropertyMutation.mutate(formData);
    } else {
      createPropertyMutation.mutate(formData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implementar subida de imágenes cuando se tenga el endpoint

};

  const handleRemoveImage = (index: number) => {
    // TODO: Implementar eliminación de imágenes cuando se tenga el endpoint

};

  const handleBack = () => {

navigate('/app/properties');
  };

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && !authLoading) {

return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Necesitas iniciar sesión para crear propiedades
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Iniciar Sesión
        </Button>
      </Box>
    );
  }

  // Si está cargando la autenticación
  if (authLoading) {

return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    );
  }

  // Si está cargando la propiedad (solo en modo edición)
  if (isEditing && loadingProperty) {

return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando propiedad...</Typography>
      </Box>
    );
  }

return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }} 
        gap={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </Typography>
        </Box>
      </Box>

      {/* Mostrar errores de mutación */}
      {(createPropertyMutation.error || updatePropertyMutation.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {createPropertyMutation.error?.message || updatePropertyMutation.error?.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={4}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Estado/Provincia"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="País"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Propiedad</InputLabel>
                  <Select
                    value={formData.property_type}
                    label="Tipo de Propiedad"
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    required
                  >
                    <MenuItem value="apartment">Apartamento</MenuItem>
                    <MenuItem value="house">Casa</MenuItem>
                    <MenuItem value="studio">Estudio</MenuItem>
                    <MenuItem value="penthouse">Penthouse</MenuItem>
                    <MenuItem value="townhouse">Casa en Condominio</MenuItem>
                    <MenuItem value="commercial">Comercial</MenuItem>
                    <MenuItem value="office">Oficina</MenuItem>
                    <MenuItem value="warehouse">Bodega</MenuItem>
                    <MenuItem value="land">Terreno</MenuItem>
                    <MenuItem value="room">Habitación</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Listado</InputLabel>
                  <Select
                    value={formData.listing_type}
                    label="Tipo de Listado"
                    onChange={(e) => setFormData({ ...formData, listing_type: e.target.value })}
                    required
                  >
                    <MenuItem value="rent">Renta</MenuItem>
                    <MenuItem value="sale">Venta</MenuItem>
                    <MenuItem value="both">Ambos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    label="Estado"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <MenuItem value="available">Disponible</MenuItem>
                    <MenuItem value="rented">Rentada</MenuItem>
                    <MenuItem value="maintenance">En Mantenimiento</MenuItem>
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="inactive">Inactiva</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Área Total (m²)"
                  type="number"
                  value={formData.total_area || ''}
                  onChange={(e) => setFormData({ ...formData, total_area: Number(e.target.value) })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Precio de Renta"
                  type="number"
                  value={formData.rent_price || ''}
                  onChange={(e) => setFormData({ ...formData, rent_price: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Habitaciones"
                  type="number"
                  value={formData.bedrooms || ''}
                  onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Baños"
                  type="number"
                  value={formData.bathrooms || ''}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Espacios de Estacionamiento"
                  type="number"
                  value={formData.parking_spaces || ''}
                  onChange={(e) => setFormData({ ...formData, parking_spaces: Number(e.target.value) })}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pisos"
                  type="number"
                  value={formData.floors || ''}
                  onChange={(e) => setFormData({ ...formData, floors: Number(e.target.value) })}
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Nota: La subida de imágenes estará disponible próximamente.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                    startIcon={
                      createPropertyMutation.isPending || updatePropertyMutation.isPending ? (
                        <CircularProgress size={20} />
                      ) : null
                    }
                  >
                    {createPropertyMutation.isPending || updatePropertyMutation.isPending
                      ? 'Guardando...'
                      : isEditing
                      ? 'Actualizar Propiedad'
                      : 'Crear Propiedad'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PropertyForm; 