import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

const LandingFooter: React.FC = () => {
  return (
    <Box
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo y descripción */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                VeriHome
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: 'grey.400',
                mb: 3,
                lineHeight: 1.6,
              }}
            >
              La plataforma inmobiliaria revolucionaria que conecta arrendadores, 
              inquilinos y prestadores de servicios de manera segura y confiable.
            </Typography>
            
            {/* Información de contacto */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmailIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                <a href="mailto:contacto@verihome.com" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <Typography variant="body2" sx={{ color: 'grey.400', '&:hover': { color: 'white' } }}>
                    contacto@verihome.com
                  </Typography>
                </a>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                <a href="tel:+5771234567" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <Typography variant="body2" sx={{ color: 'grey.400', '&:hover': { color: 'white' } }}>
                    +57 (7) 123-4567
                  </Typography>
                </a>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                <Typography variant="body2" sx={{ color: 'grey.400' }}>
                  Bucaramanga, Colombia
                </Typography>
              </Box>
            </Box>

            {/* Redes sociales */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                component="a"
                href="https://facebook.com/verihome"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'white' },
                }}
              >
                <FacebookIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://twitter.com/verihome"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'white' },
                }}
              >
                <TwitterIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://linkedin.com/company/verihome"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'white' },
                }}
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://instagram.com/verihome"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'white' },
                }}
              >
                <InstagramIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Enlaces rápidos */}
          <Grid item xs={12} md={2}>
            <MuiLink
              component={Link}
              to="/"
              sx={{ textDecoration: 'none', display: 'block', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', '&:hover': { color: 'grey.300' } }}>
                Navegación
              </Typography>
            </MuiLink>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink
                component={Link}
                to="/properties"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Propiedades
              </MuiLink>
              <MuiLink
                component={Link}
                to="/about"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Nosotros
              </MuiLink>
              <MuiLink
                component={Link}
                to="/contact"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Contacto
              </MuiLink>
            </Box>
          </Grid>

          {/* Servicios */}
          <Grid item xs={12} md={2}>
            <MuiLink
              component={Link}
              to="/services"
              sx={{ textDecoration: 'none', display: 'block', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', '&:hover': { color: 'grey.300' } }}>
                Servicios
              </Typography>
            </MuiLink>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink component={Link} to="/services#arrendamiento" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Arrendamiento
              </MuiLink>
              <MuiLink component={Link} to="/services#venta" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Venta
              </MuiLink>
              <MuiLink component={Link} to="/services#administracion" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Administración
              </MuiLink>
              <MuiLink component={Link} to="/services#servicios-profesionales" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Servicios Profesionales
              </MuiLink>
              <MuiLink component={Link} to="/services#seguros" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Seguros
              </MuiLink>
            </Box>
          </Grid>

          {/* Soporte */}
          <Grid item xs={12} md={2}>
            <MuiLink
              component={Link}
              to="/help"
              sx={{ textDecoration: 'none', display: 'block', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', '&:hover': { color: 'grey.300' } }}>
                Soporte
              </Typography>
            </MuiLink>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink
                component={Link}
                to="/help"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Centro de Ayuda
              </MuiLink>
              <MuiLink component={Link} to="/terms" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Términos y Condiciones
              </MuiLink>
              <MuiLink component={Link} to="/privacy" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Política de Privacidad
              </MuiLink>
              <MuiLink component={Link} to="/security" sx={{ color: 'grey.400', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Seguridad
              </MuiLink>
            </Box>
          </Grid>

          {/* Comunidad */}
          <Grid item xs={12} md={2}>
            <MuiLink
              component={Link}
              to="/blog"
              sx={{ textDecoration: 'none', display: 'block', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', '&:hover': { color: 'grey.300' } }}>
                Comunidad
              </Typography>
            </MuiLink>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink
                component={Link}
                to="/blog"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Blog
              </MuiLink>
              <MuiLink
                component={Link}
                to="/events"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Eventos
              </MuiLink>
              <MuiLink
                component={Link}
                to="/partners"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Socios
              </MuiLink>
              <MuiLink
                component={Link}
                to="/careers"
                sx={{
                  color: 'grey.400',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' },
                }}
              >
                Carreras
              </MuiLink>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'grey.800' }} />

        {/* Copyright */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'grey.400',
            }}
          >
            © 2026 VeriHome. Todos los derechos reservados.
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'grey.400',
            }}
          >
            Hecho con ❤️ en Colombia
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingFooter; 