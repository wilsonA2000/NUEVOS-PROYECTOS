import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Solo log para debug, puedes quitarlo si quieres

}, [isAuthenticated]);

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNavbar />
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: '70vh', md: '90vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          p: 0,
        }}
      >
        {/* Imagen de fondo SIN overlay ni filtro */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/images/hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            // filter: 'brightness(0.85)', // QUITADO
          }}
        />
        {/* Contenido principal */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { xs: '70vh', md: '90vh' } }}>
          <Box sx={{
            width: '100%',
            textAlign: 'center',
            maxWidth: 700,
            mx: 'auto',
            bgcolor: 'rgba(255,255,255,0.25)',
            borderRadius: 3,
            boxShadow: 4,
            px: { xs: 2, md: 6 },
            py: { xs: 4, md: 6 },
            backdropFilter: 'blur(2px)',
          }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ color: '#111', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              VeriHome
            </Typography>
            <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#222', fontWeight: 500, textShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              La plataforma inmobiliaria del futuro
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: '#222', textShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
              Conectamos arrendadores, arrendatarios y prestadores de servicios en una plataforma integral y confiable.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                fontWeight: 700,
                boxShadow: 3,
                mt: 3,
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              Comenzar
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          ¿Por qué elegir VeriHome?
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  Gestión Simplificada
                </Typography>
                <Typography variant="body1">
                  Administra tus propiedades, contratos y pagos desde una sola plataforma.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  Comunicación Directa
                </Typography>
                <Typography variant="body1">
                  Conecta directamente con arrendatarios y prestadores de servicios.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  Transparencia Total
                </Typography>
                <Typography variant="body1">
                  Sistema de calificaciones y verificación para mayor confianza.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <LandingFooter />
    </Box>
  );
};

export default LandingPage; 