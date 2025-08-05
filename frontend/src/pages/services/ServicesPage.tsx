import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Build as BuildIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
// import { useUser } from '../../hooks/useUser';

// MOCK TEMPORAL para evitar error de compilación
const useUser = () => ({ user: null });

const ServicesPage: React.FC = () => {
  const { user } = useUser();
  const theme = useTheme();

  // Datos de ejemplo para servicios
  const services = [
    {
      id: 1,
      name: 'Mantenimiento General',
      provider: 'Juan Pérez',
      category: 'maintenance',
      rating: 4.8,
      price: '$50/hora',
      description: 'Servicios de mantenimiento general para propiedades',
      available: true,
    },
    {
      id: 2,
      name: 'Limpieza Profesional',
      provider: 'María García',
      category: 'cleaning',
      rating: 4.9,
      price: '$30/hora',
      description: 'Servicios de limpieza profesional para hogares y oficinas',
      available: true,
    },
    {
      id: 3,
      name: 'Plomería',
      provider: 'Carlos López',
      category: 'plumbing',
      rating: 4.7,
      price: '$80/hora',
      description: 'Servicios de plomería y reparación de tuberías',
      available: false,
    },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'primary';
      case 'cleaning':
        return 'success';
      case 'plumbing':
        return 'warning';
      case 'electrical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'Mantenimiento';
      case 'cleaning':
        return 'Limpieza';
      case 'plumbing':
        return 'Plomería';
      case 'electrical':
        return 'Electricidad';
      default:
        return category;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {user?.role === 'service_provider' ? 'Mis Servicios' : 'Servicios Disponibles'}
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          {user?.role === 'service_provider' 
            ? 'Gestiona tus servicios y solicitudes de clientes'
            : 'Encuentra profesionales para tus necesidades'
          }
        </Typography>
      </Box>

      {user?.role === 'service_provider' && (
        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mb: 2 }}
          >
            Agregar Nuevo Servicio
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {services.map((service) => (
          <Grid item xs={12} md={6} lg={4} key={service.id}>
            <Card sx={{ 
              borderRadius: '12px', 
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: `${getCategoryColor(service.category)}.light`,
                    color: `${getCategoryColor(service.category)}.main`,
                    mr: 2
                  }}>
                    <BuildIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {service.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {service.provider}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getCategoryLabel(service.category)}
                    color={getCategoryColor(service.category) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={service.available ? 'Disponible' : 'No disponible'}
                    color={service.available ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  {service.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ color: 'warning.main', fontSize: 20, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {service.rating}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {service.price}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {user?.role === 'tenant' ? (
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!service.available}
                    >
                      Solicitar Servicio
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      >
                        Ver Solicitudes
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ServicesPage; 