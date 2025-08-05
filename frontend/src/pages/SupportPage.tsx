import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  Book as BookIcon,
  VideoLibrary as VideoIcon,
  Chat as ChatIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';

const SupportPage: React.FC = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: '¿Qué es VeriHome?',
      answer: 'VeriHome es una plataforma integral de gestión inmobiliaria que conecta propietarios, inquilinos y prestadores de servicios en Colombia, ofreciendo herramientas digitales para simplificar todos los aspectos del sector inmobiliario.',
    },
    {
      question: '¿Es seguro usar VeriHome?',
      answer: 'Absolutamente. Utilizamos tecnología de encriptación avanzada y verificamos a todos nuestros usuarios. Además, cumplimos con todas las regulaciones de protección de datos en Colombia.',
    },
    {
      question: '¿Qué servicios incluye la plataforma?',
      answer: 'VeriHome incluye gestión de propiedades, arrendamiento inteligente, servicios de mantenimiento, sistema de pagos, verificación de usuarios y reportes detallados.',
    },
    {
      question: '¿Cómo funciona la verificación de usuarios?',
      answer: 'Nuestro sistema verifica la identidad, antecedentes penales y historial crediticio de todos los usuarios para garantizar la seguridad de la comunidad.',
    },
    {
      question: '¿Puedo cancelar mi suscripción en cualquier momento?',
      answer: 'Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de control sin penalizaciones.',
    },
  ];

  const supportChannels = [
    {
      icon: <EmailIcon sx={{ fontSize: 40 }} />,
      title: 'Email de Soporte',
      description: 'Respuesta en 24 horas',
      contact: 'soporte@verihome.com',
      available: true,
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      title: 'Chat en Vivo',
      description: 'Soporte inmediato',
      contact: 'Disponible 24/7',
      available: false,
      premium: true,
    },
    {
      icon: <PhoneIcon sx={{ fontSize: 40 }} />,
      title: 'Teléfono',
      description: 'Atención personalizada',
      contact: '+57 (7) 123-4567',
      available: true,
    },
  ];

  const resources = [
    {
      icon: <BookIcon sx={{ fontSize: 40 }} />,
      title: 'Centro de Ayuda',
      description: 'Artículos y guías detalladas',
      features: ['Tutoriales paso a paso', 'Guías de mejores prácticas', 'Soluciones comunes'],
      premium: false,
    },
    {
      icon: <VideoIcon sx={{ fontSize: 40 }} />,
      title: 'Videos Tutoriales',
      description: 'Aprende con contenido visual',
      features: ['Tutoriales en video', 'Webinars mensuales', 'Casos de estudio'],
      premium: true,
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Seguridad y Privacidad',
      description: 'Información sobre protección de datos',
      features: ['Políticas de seguridad', 'Certificaciones', 'Mejores prácticas'],
      premium: false,
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
            Centro de Soporte
          </Typography>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            Encuentra respuestas rápidas, recursos útiles y soporte experto para maximizar 
            tu experiencia con VeriHome.
          </Typography>
        </Container>
      </Box>

      {/* Canales de Soporte */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          ¿Cómo Podemos Ayudarte?
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {supportChannels.map((channel, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {channel.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {channel.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {channel.description}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {channel.contact}
                  </Typography>
                  {channel.premium && (
                    <Chip
                      icon={<LockIcon />}
                      label="Solo usuarios registrados"
                      color="primary"
                      size="small"
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Recursos */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Recursos de Ayuda
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {resources.map((resource, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ color: 'primary.main', mr: 2 }}>
                        {resource.icon}
                      </Box>
                      <Box>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {resource.title}
                        </Typography>
                        {resource.premium && (
                          <Chip
                            icon={<LockIcon />}
                            label="Premium"
                            color="primary"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {resource.description}
                    </Typography>
                    <List dense>
                      {resource.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ py: 0 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Preguntas Frecuentes
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          Encuentra respuestas a las preguntas más comunes sobre VeriHome.
        </Typography>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {faqs.map((faq, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" component="h3">
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>

      {/* CTA */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="h4" component="h2" gutterBottom>
              ¿Necesitas Ayuda Personalizada?
            </Typography>
            <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
              Únete a VeriHome y obtén acceso a soporte prioritario, chat en vivo 
              y recursos exclusivos para maximizar tu experiencia.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                Registrarse Ahora
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/contact')}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'grey.100', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Contactar Soporte
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

export default SupportPage; 