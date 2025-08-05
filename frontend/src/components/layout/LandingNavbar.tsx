import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ContactSupport as ContactSupportIcon,
} from '@mui/icons-material';

const LandingNavbar: React.FC = () => {
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                }}
              >
                V
              </Typography>
            </Box>
            <Typography
              component={Link}
              to="/"
              variant="h5"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.7 },
              }}
            >
              VeriHome
            </Typography>
          </Box>

          {/* Enlaces de navegación */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            <Button
              component={Link}
              to="/properties"
              startIcon={<HomeIcon />}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              Propiedades
            </Button>
            <Button
              component={Link}
              to="/services"
              startIcon={<BusinessIcon />}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              Servicios
            </Button>
            <Button
              component={Link}
              to="/about"
              startIcon={<PeopleIcon />}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              Nosotros
            </Button>
            <Button
              component={Link}
              to="/contact"
              startIcon={<ContactSupportIcon />}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              Contacto
            </Button>
          </Box>

          {/* Botones de autenticación */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              Iniciar Sesión
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                },
              }}
            >
              Registrarse
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default LandingNavbar; 