import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';

const ServicesOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const services = [
    {
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      title: 'Gestión de Propiedades',
      description: 'Administra tus propiedades de manera eficiente con herramientas avanzadas.',
      features: ['Inventario digital', 'Fotos profesionales', 'Documentación segura'],
      category: 'Propietarios',
      premium: false,
    },
    {
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      title: 'Arrendamiento Inteligente',
      description: 'Encuentra inquilinos confiables con nuestro sistema de verificación.',
      features: ['Verificación de antecedentes', 'Contratos digitales', 'Pagos automáticos'],
      category: 'Propietarios',
      premium: true,
    },
    {
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      title: 'Servicios de Mantenimiento',
      description: 'Conecta con prestadores de servicios verificados y calificados.',
      features: ['Servicios verificados', 'Calificaciones reales', 'Respuesta rápida'],
      category: 'Todos',
      premium: true,
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Seguridad y Verificación',
      description: 'Sistema de verificación integral para mayor confianza.',
      features: ['Verificación de identidad', 'Antecedentes penales', 'Historial crediticio'],
      category: 'Todos',
      premium: true,
    },
    {
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      title: 'Gestión de Pagos',
      description: 'Sistema de pagos seguro y transparente para todas las transacciones.',
      features: ['Pagos automáticos', 'Recibos digitales', 'Historial completo'],
      category: 'Todos',
      premium: true,
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      title: 'Reportes y Analytics',
      description: 'Análisis detallado del rendimiento de tus propiedades.',
      features: ['Reportes mensuales', 'Análisis de rentabilidad', 'Tendencias del mercado'],
      category: 'Propietarios',
      premium: true,
    },
  ];

  const benefits = [
    {
      title: 'Ahorro de Tiempo',
      description: 'Reduce el tiempo de gestión en un 70%',
    },
    {
      title: 'Mayor Rentabilidad',
      description: 'Optimiza el rendimiento de tus inversiones',
    },
    {
      title: 'Tranquilidad',
      description: 'Gestión profesional y transparente',
    },
    {
      title: 'Comunidad',
      description: 'Acceso a una red de profesionales verificados',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNavbar />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          pt: 12,
          pb: 8,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" textAlign="center" gutterBottom>
            Nuestros Servicios
          </Typography>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            Descubre cómo VeriHome puede transformar tu experiencia inmobiliaria con servicios 
            profesionales y tecnología de vanguardia.
          </Typography>
        </Container>
      </Box>

      {/* Servicios */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Servicios Disponibles
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          Explora nuestra gama completa de servicios diseñados para simplificar 
          la gestión inmobiliaria en Colombia.
        </Typography>

        <Grid container spacing={4}>
          {services.map((service, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card sx={{ 
                height: '100%',
                position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                }
              }}>
                {service.premium && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      icon={<LockIcon />}
                      label="Premium"
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      mr: 2,
                      width: 60,
                      height: 60
                    }}>
                      {service.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {service.title}
                      </Typography>
                      <Chip 
                        label={service.category} 
                        size="small" 
                        color="secondary"
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {service.description}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    {service.features.map((feature, idx) => (
                      <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                        • {feature}
                      </Typography>
                    ))}
                  </Box>

                  {service.premium && (
                    <Box sx={{ 
                      bgcolor: 'grey.50', 
                      p: 2, 
                      borderRadius: 1,
                      textAlign: 'center',
                      mb: 2
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Disponible para usuarios registrados
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Beneficios */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Beneficios de Unirse a VeriHome
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {benefits.map((benefit, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box textAlign="center">
                  <Typography variant="h4" component="div" color="primary.main" fontWeight="bold" gutterBottom>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {benefit.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h2" gutterBottom>
            ¿Listo para Experimentar VeriHome?
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
            Únete a nuestra comunidad inmobiliaria exclusiva y descubre cómo podemos 
            transformar tu experiencia en el sector inmobiliario.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
            >
              Registrarse Gratis
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/contact')}
            >
              Solicitar Demo
            </Button>
          </Box>
        </Box>
      </Container>

      <LandingFooter />
    </Box>
  );
};

export default ServicesOverviewPage; 