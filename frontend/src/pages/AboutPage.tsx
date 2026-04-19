import React from 'react';
import { vhColors } from '../theme/tokens';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Paper,
  Fade,
  Grow,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Verified as VerifiedIcon,
  Handshake as HandshakeIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';

const CARD_HOVER_SX = {
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

const SectionDivider: React.FC = () => (
  <Box
    sx={{
      width: 48,
      height: 4,
      bgcolor: 'primary.main',
      borderRadius: 2,
      mx: 'auto',
      mb: 4,
    }}
  />
);

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  // Scroll reveal refs
  const historyReveal = useScrollReveal({ threshold: 0.1 });
  const missionReveal = useScrollReveal({ threshold: 0.1 });
  const valuesReveal = useScrollReveal({ threshold: 0.1 });
  const featuresReveal = useScrollReveal({ threshold: 0.1 });
  const statsReveal = useScrollReveal({ threshold: 0.15 });
  const teamReveal = useScrollReveal({ threshold: 0.1 });
  const ctaReveal = useScrollReveal({ threshold: 0.1 });

  const values = [
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Verificación',
      description: 'Cada usuario está verificado para garantizar la seguridad de nuestra comunidad.',
    },
    {
      icon: <HandshakeIcon sx={{ fontSize: 40 }} />,
      title: 'Confianza',
      description: 'Construimos relaciones basadas en la honestidad y transparencia total.',
    },
    {
      icon: <ShieldIcon sx={{ fontSize: 40 }} />,
      title: 'Seguridad',
      description: 'Protegemos cada transacción con los más altos estándares de seguridad.',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      title: 'Comunidad',
      description: 'Conectamos personas para crear una red inmobiliaria confiable y respaldada.',
    },
  ];

  const team = [
    {
      name: 'Wilson Andrés Arguello Castellanos',
      role: 'CEO y Fundador',
      avatar: '/static/images/team-1.jpg',
      description: 'Abogado graduado de la Universidad Santo Tomás Bucaramanga, fundador y líder visionario de VeriHome. Apasionado por la innovación en el sector inmobiliario colombiano y por crear soluciones legales y tecnológicas que generen confianza y seguridad en la comunidad.',
    },
  ];

  const stats = [
    { number: '500+', label: 'Propiedades Gestionadas' },
    { number: '1000+', label: 'Usuarios Verificados' },
    { number: '50+', label: 'Prestadores de Servicios' },
    { number: '98%', label: 'Satisfacción del Cliente' },
  ];

  const features = [
    {
      icon: <VerifiedIcon sx={{ fontSize: 40 }} />,
      title: 'Usuarios Verificados',
      description: 'Cada miembro de nuestra comunidad pasa por un riguroso proceso de verificación de identidad, antecedentes y capacidad financiera.',
    },
    {
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      title: 'Propiedades Transparentes',
      description: 'Información completa y verificada de cada propiedad, incluyendo fotos reales, documentación legal y estado actual.',
    },
    {
      icon: <StarIcon sx={{ fontSize: 40 }} />,
      title: 'Sistema de Calificaciones',
      description: 'Evaluación mutua entre usuarios que garantiza la calidad y confiabilidad de cada interacción en la plataforma.',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      title: 'Contratos Digitales',
      description: 'Proceso de contratación transparente y seguro, con documentos legales verificados y firmas digitales certificadas.',
    },
    {
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      title: 'Aplicación Web Robusta',
      description: 'Nuestra aplicación web es robusta y confiable, con módulos integrados que permiten a los usuarios tener el control total de todos los procesos inmobiliarios: gestión de propiedades, contratos, pagos, mensajería y más. Todo desde un solo lugar, de forma segura y eficiente.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNavbar />

      {/* Hero Section */}
      <Fade in timeout={800}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${vhColors.accentBlue} 0%, ${vhColors.purple} 100%)`,
            color: 'white',
            pt: 12,
            pb: 8,
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h2" component="h1" textAlign="center" gutterBottom>
              Quiénes Somos
            </Typography>
            <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
              VeriHome (VH): Donde la verificación se encuentra con el hogar
            </Typography>
          </Container>
        </Box>
      </Fade>

      {/* Reseña Principal */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <div ref={historyReveal.ref}>
          <Fade in={historyReveal.isVisible} timeout={700}>
            <Paper sx={{ p: 6, mb: 6, bgcolor: 'grey.50' }}>
              <Typography variant="h4" component="h2" gutterBottom align="center">
                Nuestra Historia
              </Typography>
              <SectionDivider />
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, textAlign: 'justify' }}>
                En <strong>VeriHome</strong>, creemos que el éxito de un alquiler, venta o servicio inmobiliario se basa en algo más que propiedades:
                <strong> las personas que hacen posible cada transacción</strong>.
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, textAlign: 'justify' }}>
                Somos una comunidad de arrendadores, arrendatarios y prestadores de servicios que comparten un
                <strong> compromiso inquebrantable con la honestidad, confianza y seguridad</strong>.
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, textAlign: 'justify' }}>
                Nuestra plataforma ofrece un entorno donde cada usuario está verificado, cada propiedad es transparente
                y cada servicio cumple con altos estándares. A través de un sistema de calificación entre usuarios,
                mensajería privada y contratos digitales, garantizamos transacciones claras y seguras.
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, fontWeight: 'bold', textAlign: 'justify' }}>
                VeriHome es más que un espacio para encontrar una propiedad, es la garantía de una relación confiable
                en el mundo inmobiliario. ¡Bienvenido a la nueva forma de alquilar, comprar y contratar servicios con total seguridad!
              </Typography>
            </Paper>
          </Fade>
        </div>
      </Container>

      {/* Misión y Visión */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <div ref={missionReveal.ref}>
          <Fade in={missionReveal.isVisible} timeout={700}>
            <Grid container spacing={6}>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" component="h2" gutterBottom>
                  Nuestra Misión
                </Typography>
                <Box sx={{ width: 48, height: 4, bgcolor: 'primary.main', borderRadius: 2, mb: 3 }} />
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7, textAlign: 'justify' }}>
                  Transformar el mercado inmobiliario colombiano creando un ecosistema digital donde la
                  <strong> verificación, transparencia y confianza</strong> sean los pilares fundamentales de cada transacción.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7, textAlign: 'justify' }}>
                  Nos comprometemos a conectar arrendadores, arrendatarios y prestadores de servicios
                  a través de una plataforma que garantice la seguridad, facilite las transacciones
                  y construya relaciones duraderas basadas en la honestidad y el respaldo mutuo.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" component="h2" gutterBottom>
                  Nuestra Visión
                </Typography>
                <Box sx={{ width: 48, height: 4, bgcolor: 'primary.main', borderRadius: 2, mb: 3 }} />
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7, textAlign: 'justify' }}>
                  Ser la <strong>plataforma líder en Colombia</strong> que revolucione la forma en que las personas
                  interactúan con el mercado inmobiliario, estableciendo nuevos estándares de
                  <strong> confiabilidad, seguridad y transparencia</strong> en el sector.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7, textAlign: 'justify' }}>
                  Aspiramos a crear la comunidad inmobiliaria más confiable del país, donde cada
                  transacción esté respaldada por verificación rigurosa y donde la confianza
                  sea el valor fundamental que impulse el crecimiento del sector.
                </Typography>
              </Grid>
            </Grid>
          </Fade>
        </div>
      </Container>

      {/* Valores */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <div ref={valuesReveal.ref}>
            <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
              Nuestros Valores Fundamentales
            </Typography>
            <SectionDivider />
            <Typography variant="body1" textAlign="center" sx={{ maxWidth: 800, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
              Estos valores guían cada decisión que tomamos y cada interacción que facilitamos en nuestra plataforma.
            </Typography>
            <Grid container spacing={4} sx={{ mt: 4 }}>
              {values.map((value, index) => (
                <Grid item xs={12} md={6} lg={3} key={index}>
                  <Grow
                    in={valuesReveal.isVisible}
                    timeout={600 + index * 150}
                    style={{ transformOrigin: 'center bottom' }}
                  >
                    <Card sx={{ height: '100%', textAlign: 'center', ...CARD_HOVER_SX }}>
                      <CardContent>
                        <Box sx={{ color: 'primary.main', mb: 2 }}>
                          {value.icon}
                        </Box>
                        <Typography variant="h5" component="h3" gutterBottom>
                          {value.title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'justify' }}>
                          {value.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          </div>
        </Container>
      </Box>

      {/* Características de la Plataforma */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <div ref={featuresReveal.ref}>
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            ¿Qué Hace Única a VeriHome?
          </Typography>
          <SectionDivider />
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 800, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
            Nuestras características distintivas que garantizan la confianza y seguridad en cada transacción.
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Grow
                  in={featuresReveal.isVisible}
                  timeout={600 + index * 150}
                  style={{ transformOrigin: 'center bottom' }}
                >
                  <Card sx={{ height: '100%', ...CARD_HOVER_SX }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ color: 'primary.main', mr: 2 }}>
                          {feature.icon}
                        </Box>
                        <Typography variant="h6" component="h3">
                          {feature.title}
                        </Typography>
                      </Box>
                      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'justify' }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </div>
      </Container>

      {/* Estadísticas */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <div ref={statsReveal.ref}>
            <Fade in={statsReveal.isVisible} timeout={700}>
              <Box>
                <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
                  Nuestro Impacto en Números
                </Typography>
                <Grid container spacing={4} sx={{ mt: 4 }}>
                  {stats.map((stat, index) => (
                    <Grid item xs={6} md={3} key={index}>
                      <Box textAlign="center">
                        <Typography variant="h2" component="div" fontWeight="bold" gutterBottom>
                          {stat.number}
                        </Typography>
                        <Typography variant="body1">
                          {stat.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
          </div>
        </Container>
      </Box>

      {/* Equipo */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <div ref={teamReveal.ref}>
            <Fade in={teamReveal.isVisible} timeout={700}>
              <Box>
                <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
                  El Equipo Detrás de VeriHome
                </Typography>
                <SectionDivider />
                <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
                  Conoce a las personas apasionadas que están transformando el sector inmobiliario colombiano.
                </Typography>
                <Grid container spacing={4}>
                  {team.map((member, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card sx={{ textAlign: 'center', height: '100%', ...CARD_HOVER_SX }}>
                        <CardContent>
                          <Avatar
                            sx={{
                              width: 120,
                              height: 120,
                              mx: 'auto',
                              mb: 2,
                              bgcolor: 'primary.main',
                            }}
                          >
                            {member.name.charAt(0)}
                          </Avatar>
                          <Typography variant="h5" component="h3" gutterBottom>
                            {member.name}
                          </Typography>
                          <Typography variant="subtitle1" color="primary.main" gutterBottom>
                            {member.role}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'justify' }}>
                            {member.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
          </div>
        </Container>
      </Box>

      {/* CTA */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <div ref={ctaReveal.ref}>
          <Fade in={ctaReveal.isVisible} timeout={700}>
            <Box textAlign="center">
              <Typography variant="h4" component="h2" gutterBottom>
                Únete a la Revolución Inmobiliaria
              </Typography>
              <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
                Sé parte de la comunidad que está transformando la forma en que se hacen las transacciones
                inmobiliarias en Colombia. VeriHome: donde la confianza se encuentra con el hogar.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{ mr: 2 }}
                >
                  Registrarse Gratis
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/contact')}
                >
                  Conocer Más
                </Button>
              </Box>
            </Box>
          </Fade>
        </div>
      </Container>

      <LandingFooter />
    </Box>
  );
};

export default AboutPage;
