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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();

  const communityFeatures = [
    {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      title: 'Red de Profesionales',
      description: 'Conecta con propietarios, inquilinos y prestadores de servicios verificados.',
      benefits: ['Perfiles verificados', 'Calificaciones reales', 'Red de confianza'],
      premium: true,
    },
    {
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      title: 'Eventos Exclusivos',
      description: 'Participa en webinars, talleres y networking events del sector inmobiliario.',
      benefits: ['Webinars mensuales', 'Talleres prácticos', 'Networking profesional'],
      premium: true,
    },
    {
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      title: 'Programa de Socios',
      description: 'Únete a nuestro programa de socios y expande tu negocio.',
      benefits: ['Comisiones atractivas', 'Soporte dedicado', 'Herramientas exclusivas'],
      premium: true,
    },
    {
      icon: <WorkIcon sx={{ fontSize: 40 }} />,
      title: 'Oportunidades Laborales',
      description: 'Encuentra las mejores oportunidades en el sector inmobiliario.',
      benefits: ['Ofertas exclusivas', 'Empresas verificadas', 'Proceso simplificado'],
      premium: true,
    },
  ];

  const blogPosts = [
    {
      title: 'Tendencias del Mercado Inmobiliario 2025',
      excerpt: 'Descubre las principales tendencias que están transformando el sector inmobiliario en Colombia.',
      category: 'Mercado',
      readTime: '5 min',
      premium: false,
    },
    {
      title: 'Guía Completa para Invertir en Propiedades',
      excerpt: 'Todo lo que necesitas saber para hacer inversiones inmobiliarias inteligentes.',
      category: 'Inversión',
      readTime: '8 min',
      premium: true,
    },
    {
      title: 'Cómo Maximizar el Rendimiento de tu Propiedad',
      excerpt: 'Estrategias probadas para aumentar la rentabilidad de tus inversiones inmobiliarias.',
      category: 'Gestión',
      readTime: '6 min',
      premium: true,
    },
  ];

  const upcomingEvents = [
    {
      title: 'Webinar: Financiamiento Inmobiliario',
      date: '15 de Enero, 2025',
      time: '7:00 PM',
      description: 'Aprende sobre las mejores opciones de financiamiento para tu próxima inversión.',
      attendees: '150+ registrados',
      premium: true,
    },
    {
      title: 'Taller: Gestión Eficiente de Propiedades',
      date: '22 de Enero, 2025',
      time: '2:00 PM',
      description: 'Herramientas y estrategias para optimizar la gestión de tus propiedades.',
      attendees: '80+ registrados',
      premium: true,
    },
  ];

  const partnerBenefits = [
    'Comisiones del 15% en cada transacción',
    'Soporte dedicado y capacitación',
    'Acceso a herramientas exclusivas',
    'Marketing y promoción incluidos',
    'Red de contactos profesionales',
    'Eventos de networking exclusivos',
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
            Nuestra Comunidad
          </Typography>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            Únete a la comunidad inmobiliaria más exclusiva de Colombia. Conecta, aprende 
            y crece junto a profesionales verificados del sector.
          </Typography>
        </Container>
      </Box>

      {/* Características de la Comunidad */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          ¿Qué Ofrece Nuestra Comunidad?
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {communityFeatures.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ color: 'primary.main', mr: 2 }}>
                      {feature.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {feature.title}
                      </Typography>
                      {feature.premium && (
                        <Chip
                          icon={<LockIcon />}
                          label="Exclusivo"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>
                  <List dense>
                    {feature.benefits.map((benefit, idx) => (
                      <ListItem key={idx} sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Blog */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Blog y Contenido
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
            Mantente actualizado con las últimas noticias, tendencias y consejos del sector inmobiliario.
          </Typography>

          <Grid container spacing={4}>
            {blogPosts.map((post, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip label={post.category} size="small" color="secondary" />
                      {post.premium && (
                        <Chip
                          icon={<LockIcon />}
                          label="Premium"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {post.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {post.excerpt}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {post.readTime} de lectura
                      </Typography>
                      <Button size="small" color="primary">
                        Leer más
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Eventos */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Próximos Eventos
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {upcomingEvents.map((event, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {event.title}
                    </Typography>
                    {event.premium && (
                      <Chip
                        icon={<LockIcon />}
                        label="Exclusivo"
                        color="primary"
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {event.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {event.date} - {event.time}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.attendees}
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small">
                      Registrarse
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Programa de Socios */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Programa de Socios
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
            Únete a nuestro programa de socios y forma parte del crecimiento de la 
            comunidad inmobiliaria más importante de Colombia.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" component="h3" gutterBottom>
                Beneficios Exclusivos
              </Typography>
              <List>
                {partnerBenefits.map((benefit, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <CheckCircleIcon color="inherit" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={benefit} />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" component="div" gutterBottom>
                  ¿Listo para Unirte?
                </Typography>
                <Typography variant="body1" paragraph>
                  Conviértete en socio de VeriHome y accede a beneficios exclusivos 
                  mientras ayudas a otros a encontrar su hogar ideal.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/contact')}
                  sx={{ 
                    bgcolor: 'white', 
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  Solicitar Información
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Final */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h2" gutterBottom>
            Únete a Nuestra Comunidad Exclusiva
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
            Accede a contenido premium, eventos exclusivos, networking profesional 
            y oportunidades únicas en el sector inmobiliario colombiano.
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
              Conocer Más
            </Button>
          </Box>
        </Box>
      </Container>

      <LandingFooter />
    </Box>
  );
};

export default CommunityPage; 