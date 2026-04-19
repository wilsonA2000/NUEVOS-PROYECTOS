import React from 'react';
import { vhColors } from '../theme/tokens';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Fade,
  Grow,
  Divider,
} from '@mui/material';
import {
  VerifiedUser as VerifiedUserIcon,
  Forum as ForumIcon,
  Visibility as VisibilityIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Fingerprint as FingerprintIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';

const cardHoverSx = {
  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
};

const SectionTitle: React.FC<{ children: React.ReactNode; subtitle?: string }> = ({ children, subtitle }) => (
  <Box sx={{ textAlign: 'center', mb: 6 }}>
    <Typography variant="h3" component="h2" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
      {children}
    </Typography>
    <Divider sx={{ width: 48, mx: 'auto', borderColor: 'primary.main', borderWidth: 2, my: 2 }} />
    {subtitle && (
      <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', mt: 1 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

const ScrollRevealBox: React.FC<{ children: React.ReactNode; delay?: number; type?: 'fade' | 'grow' }> = ({ children, delay = 0, type = 'fade' }) => {
  const { ref, isVisible } = useScrollReveal();
  const Transition = type === 'grow' ? Grow : Fade;
  return (
    <Box ref={ref}>
      <Transition in={isVisible} timeout={600 + delay} style={{ transitionDelay: `${delay}ms` }}>
        <Box>{children}</Box>
      </Transition>
    </Box>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <VerifiedUserIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Gestión Simplificada',
      description: 'Administra propiedades, contratos, pagos y mantenimientos desde una sola plataforma. Sin papeleo, sin intermediarios innecesarios.',
    },
    {
      icon: <ForumIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Comunicación Directa',
      description: 'Mensajería en tiempo real entre arrendadores, arrendatarios y proveedores de servicios. Notificaciones instantáneas y seguimiento de conversaciones.',
    },
    {
      icon: <VisibilityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Transparencia Total',
      description: 'Sistema de calificaciones verificadas, historial de transacciones y documentos auditables. Cada interacción queda registrada de forma segura.',
    },
  ];

  const steps = [
    {
      icon: <PersonAddIcon sx={{ fontSize: 32, color: 'white' }} />,
      title: 'Regístrate y verifica tu identidad',
      description: 'Crea tu cuenta con verificación de identidad colombiana. Tu información está protegida con estándares bancarios.',
    },
    {
      icon: <SearchIcon sx={{ fontSize: 32, color: 'white' }} />,
      title: 'Explora propiedades o publica las tuyas',
      description: 'Busca propiedades con filtros avanzados o publica las tuyas con fotos, videos y ubicación en mapa.',
    },
    {
      icon: <FingerprintIcon sx={{ fontSize: 32, color: 'white' }} />,
      title: 'Firma contratos con autenticación biométrica',
      description: 'Contratos digitales con validez legal. Autenticación facial, dactilar y de voz para máxima seguridad.',
    },
  ];

  const stats = [
    { value: '500+', label: 'Propiedades Gestionadas' },
    { value: '1,000+', label: 'Usuarios Verificados' },
    { value: '50+', label: 'Proveedores de Servicios' },
    { value: '98%', label: 'Satisfacción del Cliente' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.paper' }}>
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
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/images/hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { xs: '70vh', md: '90vh' } }}>
          <Box sx={{
            textAlign: 'center',
            maxWidth: 720,
            mx: 'auto',
            bgcolor: 'rgba(255,255,255,0.85)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            px: { xs: 3, md: 7 },
            py: { xs: 5, md: 7 },
            backdropFilter: 'blur(16px)',
          }}>
            <Fade in timeout={600}>
              <Typography variant="h2" component="h1" sx={{ color: 'text.primary', fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
                VeriHome
              </Typography>
            </Fade>
            <Fade in timeout={800} style={{ transitionDelay: '200ms' }}>
              <Typography variant="h5" component="h2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 2 }}>
                La plataforma inmobiliaria del futuro
              </Typography>
            </Fade>
            <Fade in timeout={800} style={{ transitionDelay: '400ms' }}>
              <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 540, mx: 'auto', lineHeight: 1.7 }}>
                Conectamos arrendadores, arrendatarios y prestadores de servicios en una plataforma integral, segura y con contratos biométricos legalmente válidos.
              </Typography>
            </Fade>
            <Fade in timeout={800} style={{ transitionDelay: '600ms' }}>
              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{ fontWeight: 700, px: 4, py: 1.5 }}
                >
                  Comenzar gratis
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/about')}
                  sx={{ fontWeight: 600, px: 4, py: 1.5 }}
                >
                  Conocer más
                </Button>
              </Box>
            </Fade>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <ScrollRevealBox>
          <SectionTitle subtitle="Una plataforma diseñada para simplificar cada aspecto de la gestión inmobiliaria en Colombia.">
            ¿Por qué elegir VeriHome?
          </SectionTitle>
        </ScrollRevealBox>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <ScrollRevealBox delay={index * 150} type="grow">
                <Card sx={{ height: '100%', ...cardHoverSx }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h5" component="h3" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </ScrollRevealBox>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works */}
      <Box sx={{ bgcolor: vhColors.background, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <ScrollRevealBox>
            <SectionTitle subtitle="Tres pasos para comenzar a gestionar tus propiedades de forma profesional.">
              Cómo funciona
            </SectionTitle>
          </ScrollRevealBox>
          <Grid container spacing={4} alignItems="stretch">
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <ScrollRevealBox delay={index * 150} type="grow">
                  <Box sx={{ textAlign: 'center', px: 2 }}>
                    <Box sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}>
                      {step.icon}
                    </Box>
                    <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 2 }}>
                      Paso {index + 1}
                    </Typography>
                    <Typography variant="h6" component="h4" sx={{ color: 'text.primary', fontWeight: 600, mt: 1, mb: 1.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {step.description}
                    </Typography>
                  </Box>
                </ScrollRevealBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ background: `linear-gradient(135deg, ${vhColors.accentBlue} 0%, ${vhColors.primary} 100%)`, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <ScrollRevealBox>
            <Grid container spacing={4}>
              {stats.map((stat, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, letterSpacing: '-0.02em' }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5, fontWeight: 500 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </ScrollRevealBox>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box sx={{ bgcolor: vhColors.background, py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md">
          <ScrollRevealBox>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}>
                ¿Listo para transformar tu experiencia inmobiliaria?
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto', lineHeight: 1.7 }}>
                Únete a la plataforma que está revolucionando el sector inmobiliario en Colombia con tecnología de punta y seguridad biométrica.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" size="large" onClick={() => navigate('/register')} sx={{ fontWeight: 700, px: 4, py: 1.5 }}>
                  Comenzar gratis
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/contact')} sx={{ fontWeight: 600, px: 4, py: 1.5 }}>
                  Contactar equipo
                </Button>
              </Box>
            </Box>
          </ScrollRevealBox>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

export default LandingPage;
