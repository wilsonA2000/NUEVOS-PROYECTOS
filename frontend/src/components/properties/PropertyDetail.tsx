import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import PropertyImage from '../common/PropertyImage';
import {
  Home as HomeIcon,
  Hotel as HotelIcon,
  Bathtub as BathtubIcon,
  SquareFoot as SquareFootIcon,
  AttachMoney as AttachMoneyIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useProperty, useProperties } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import ContactLandlord from './ContactLandlord';

export const PropertyDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { property, isLoading, error } = useProperty(id || '');
  const { deleteProperty } = useProperties();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Property es obtenida directamente del hook useProperty

if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando propiedad...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar la propiedad
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Detalles del error: {error.message || 'Error desconocido'}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </Box>
    );
  }

  if (!property) {
    return (
      <Box py={4}>
        <Alert severity="warning">
          Propiedad no encontrada
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate('/app/properties')}
          sx={{ mt: 2 }}
        >
          Volver a Propiedades
        </Button>
      </Box>
    );
  }

  // Verificar permisos según el rol
  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';
  const isServiceProvider = user?.user_type === 'service_provider';
  const isPropertyOwner = property.landlord?.id === user?.id;
  const canEdit = isLandlord && isPropertyOwner;
  const canContact = (isTenant || isServiceProvider) && !isPropertyOwner;

return (
    <Box>
      <Card>
        <PropertyImage
          src={
            property.images && property.images.length > 0 
              ? property.images[0].image_url || property.images[0].image || property.images[0]
              : property.main_image_url || '/images/property-placeholder.svg'
          }
          alt={property.title || property.address}
          height="400"
          style={{ borderRadius: '8px 8px 0 0' }}
        />
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h5" component="div">
              {property.title || property.address}
            </Typography>
            <Chip
              label={property.status}
              color={
                property.status === 'available'
                  ? 'success'
                  : property.status === 'rented'
                  ? 'primary'
                  : 'warning'
              }
            />
          </Box>

          <Typography variant="body1" color="text.secondary" paragraph>
            {property.description}
          </Typography>

          {/* Información de ubicación */}
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h6" component="span" sx={{ mr: 1 }}>
              📍 Ubicación: 
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {property.address}
              {property.city && `, ${property.city}`}
              {property.state && `, ${property.state}`}
            </Typography>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={4}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tipo"
                    secondary={property.property_type === 'apartment' ? 'Apartamento' : 
                              property.property_type === 'house' ? 'Casa' : 
                              property.property_type === 'studio' ? 'Estudio' :
                              property.property_type === 'commercial' ? 'Comercial' : 
                              property.property_type}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <HotelIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Habitaciones"
                    secondary={property.bedrooms || 'N/A'}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BathtubIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Baños"
                    secondary={property.bathrooms || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SquareFootIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Área Total"
                    secondary={property.total_area ? `${property.total_area} m²` : 'N/A'}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <List>
                {property.rent_price && (
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoneyIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Precio de Renta"
                      secondary={`$${property.rent_price.toLocaleString('es-CO')} COP/mes`}
                    />
                  </ListItem>
                )}
                {property.sale_price && (
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoneyIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Precio de Venta"
                      secondary={`$${property.sale_price.toLocaleString('es-CO')} COP`}
                    />
                  </ListItem>
                )}
                {property.security_deposit && (
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoneyIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Depósito de Seguridad"
                      secondary={`$${property.security_deposit.toLocaleString('es-CO')} COP`}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>

          {/* Amenidades desde amenity_relations */}
          {property.amenity_relations && property.amenity_relations.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Amenidades
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {property.amenity_relations
                  .filter(relation => relation.available)
                  .map((relation) => (
                    <Chip 
                      key={relation.id} 
                      label={relation.amenity.name} 
                      color="primary"
                      variant="outlined"
                    />
                  ))}
              </Box>
            </>
          )}
          
          {/* Características adicionales */}
          {property.property_features && property.property_features.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Características
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {property.property_features.map((feature, index) => (
                  <Chip 
                    key={index} 
                    label={feature} 
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}
          
          {/* Utilidades incluidas */}
          {property.utilities_included && property.utilities_included.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Utilidades Incluidas
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {property.utilities_included.map((utility, index) => (
                  <Chip 
                    key={index} 
                    label={utility} 
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}

          {/* Información adicional de la propiedad */}
          {(property.furnished || property.pets_allowed || property.smoking_allowed || property.parking_spaces > 0) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Información Adicional
              </Typography>
              <Grid container spacing={2}>
                {property.furnished && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" color="success.main">
                        ✅ Amueblado
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {property.pets_allowed && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" color="success.main">
                        🐾 Mascotas permitidas
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {property.smoking_allowed && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" color="warning.main">
                        🚬 Fumar permitido
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {property.parking_spaces > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        🚗 {property.parking_spaces} espacios de parqueo
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {property.minimum_lease_term && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        📅 Contrato mínimo: {property.minimum_lease_term} meses
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {property.year_built && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        🏗️ Año de construcción: {property.year_built}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          <Box display="flex" gap={2} mt={3} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/app/properties')}
            >
              Volver
            </Button>
            
            {/* Botones según el rol del usuario */}
            {canEdit && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/app/properties/${property.id}/edit`)}
                >
                  Editar Propiedad
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={async () => {
                    if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
                      try {
                        await deleteProperty.mutateAsync(property.id.toString());
                        navigate('/app/properties');
                      } catch (error) {
                        console.error('❌ PropertyDetail: Error al eliminar propiedad:', error);
                      }
                    }
                  }}
                >
                  Eliminar
                </Button>
              </>
            )}
            
            {canContact && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<MessageIcon />}
                onClick={() => setContactDialogOpen(true)}
              >
                Contactar Arrendador
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Diálogo de contacto */}
      {canContact && (
        <ContactLandlord
          property={property}
          open={contactDialogOpen}
          onClose={() => setContactDialogOpen(false)}
        />
      )}
    </Box>
  );
}; 