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
  Fade,
  Grow,
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
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';

const sectionConfig: Record<string, { title: string; subtitle: string; section: string }> = {
  '/blog': {
    title: 'Blog y Contenido',
    subtitle: 'Mantente actualizado con las últimas noticias, tendencias y consejos del sector inmobiliario colombiano.',
    section: 'blog',
  },
  '/events': {
    title: 'Eventos',
    subtitle: 'Participa en webinars, talleres y eventos de networking del sector inmobiliario.',
    section: 'events',
  },
  '/partners': {
    title: 'Programa de Socios',
    subtitle: 'Únete a nuestro programa de socios y expande tu negocio en el sector inmobiliario.',
    section: 'partners',
  },
  '/careers': {
    title: 'Oportunidades Laborales',
    subtitle: 'Encuentra las mejores oportunidades profesionales en el sector inmobiliario colombiano.',
    section: 'careers',
  },
};

const CARD_HOVER_SX = {
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

// ─── Section Components ───────────────────────────────────────────────────────

interface CommunityFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  premium: boolean;
}

const CommunityFeaturesSection: React.FC<{ features: CommunityFeature[] }> = ({ features }) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.08 });
  return (
    <Box component="section" id="community-features">
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          ¿Qué Ofrece Nuestra Comunidad?
        </Typography>
        <Grid ref={ref} container spacing={4} sx={{ mt: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Grow in={isVisible} timeout={400 + index * 150}>
                <Card sx={{ height: '100%', ...CARD_HOVER_SX }}>
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
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

interface BlogPost {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  premium: boolean;
}

const BlogSection: React.FC<{ posts: BlogPost[]; onReadMore: () => void }> = ({ posts, onReadMore }) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.08 });
  return (
    <Box component="section" id="blog" sx={{ bgcolor: 'grey.50', py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Blog y Contenido
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          Mantente actualizado con las últimas noticias, tendencias y consejos del sector inmobiliario.
        </Typography>
        <Grid ref={ref} container spacing={4}>
          {posts.map((post, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Grow in={isVisible} timeout={400 + index * 150}>
                <Card sx={{ height: '100%', ...CARD_HOVER_SX }}>
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
                      <Button size="small" color="primary" onClick={onReadMore}>
                        Leer más
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

interface UpcomingEvent {
  title: string;
  date: string;
  time: string;
  description: string;
  attendees: string;
  premium: boolean;
}

const EventsSection: React.FC<{ events: UpcomingEvent[]; onRegister: () => void }> = ({ events, onRegister }) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.08 });
  return (
    <Box component="section" id="events">
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Próximos Eventos
        </Typography>
        <Grid ref={ref} container spacing={4} sx={{ mt: 4 }}>
          {events.map((event, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Grow in={isVisible} timeout={400 + index * 150}>
                <Card sx={{ ...CARD_HOVER_SX }}>
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
                      <Button variant="outlined" size="small" onClick={onRegister}>
                        Registrarse
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const PartnersSection: React.FC<{ benefits: string[]; onContact: () => void }> = ({ benefits, onContact }) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.08 });
  return (
    <Box component="section" id="partners" sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Programa de Socios
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          Únete a nuestro programa de socios y forma parte del crecimiento de la
          comunidad inmobiliaria más importante de Colombia.
        </Typography>
        <Fade in={isVisible} timeout={700}>
          <Grid ref={ref} container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" component="h3" gutterBottom>
                Beneficios Exclusivos
              </Typography>
              <List>
                {benefits.map((benefit, index) => (
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
                  onClick={onContact}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                >
                  Solicitar Información
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Fade>
      </Container>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = sectionConfig[location.pathname] ?? {
    title: 'Nuestra Comunidad',
    subtitle: 'Únete a la comunidad inmobiliaria más exclusiva de Colombia.',
    section: 'blog',
  };

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
      title: 'Tendencias del Mercado Inmobiliario 2026',
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
      date: '15 de Abril, 2026',
      time: '7:00 PM',
      description: 'Aprende sobre las mejores opciones de financiamiento para tu próxima inversión.',
      attendees: '150+ registrados',
      premium: true,
    },
    {
      title: 'Taller: Gestión Eficiente de Propiedades',
      date: '22 de Abril, 2026',
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

  // ── Section render functions (ordered by route) ──────────────────────────
  const sectionBlog = (
    <BlogSection
      key="blog"
      posts={blogPosts}
      onReadMore={() => navigate('/register')}
    />
  );

  const sectionEvents = (
    <EventsSection
      key="events"
      events={upcomingEvents}
      onRegister={() => navigate('/register')}
    />
  );

  const sectionPartners = (
    <PartnersSection
      key="partners"
      benefits={partnerBenefits}
      onContact={() => navigate('/contact')}
    />
  );

  const sectionCommunity = (
    <CommunityFeaturesSection key="community" features={communityFeatures} />
  );

  const getSectionOrder = (): React.ReactNode[] => {
    switch (config.section) {
      case 'blog':
        return [sectionBlog, sectionCommunity, sectionEvents, sectionPartners];
      case 'events':
        return [sectionEvents, sectionCommunity, sectionBlog, sectionPartners];
      case 'partners':
        return [sectionPartners, sectionCommunity, sectionBlog, sectionEvents];
      case 'careers':
        return [sectionCommunity, sectionBlog, sectionEvents, sectionPartners];
      default:
        return [sectionBlog, sectionCommunity, sectionEvents, sectionPartners];
    }
  };

  const { ref: ctaRef, isVisible: ctaVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNavbar />

      {/* Hero Section */}
      <Fade in timeout={800}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            color: 'white',
            pt: 12,
            pb: 8,
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h2" component="h1" textAlign="center" gutterBottom>
              {config.title}
            </Typography>
            <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
              {config.subtitle}
            </Typography>
          </Container>
        </Box>
      </Fade>

      {/* Dynamic section order based on route */}
      {getSectionOrder()}

      {/* CTA Final */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Fade in={ctaVisible} timeout={700}>
          <Box ref={ctaRef} textAlign="center">
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
        </Fade>
      </Container>

      <LandingFooter />
    </Box>
  );
};

export default CommunityPage;
