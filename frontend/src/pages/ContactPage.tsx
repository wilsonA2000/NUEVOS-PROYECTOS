import React, { useState } from 'react';
import { vhColors } from '../theme/tokens';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Paper,
  Fade,
  Grow,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Send as SendIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const CARD_HOVER_SX = {
  transition:
    'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

const ContactPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');

  // Scroll reveal refs
  const infoCardsReveal = useScrollReveal({ threshold: 0.1 });
  const formReveal = useScrollReveal({ threshold: 0.1 });
  const mapReveal = useScrollReveal({ threshold: 0.1 });

  const googleMapsQuery = encodeURIComponent(
    'Calle 13 #28-42, San Alonso, Bucaramanga, Santander, Colombia',
  );
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${googleMapsQuery}&output=embed`;
  const googleMapsLinkUrl = `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`;

  const contactInfo = [
    {
      icon: <EmailIcon sx={{ fontSize: 40 }} />,
      title: 'Email',
      content: 'info@verihome.com',
      subtitle: 'Soporte general',
    },
    {
      icon: <PhoneIcon sx={{ fontSize: 40 }} />,
      title: 'Teléfono',
      content: '+57 (7) 123-4567',
      subtitle: 'Lun-Vie 8:00-18:00',
    },
    {
      icon: <LocationIcon sx={{ fontSize: 40 }} />,
      title: 'Oficina',
      content: 'Calle 13 # 28-42, San Alonso',
      subtitle: 'Bucaramanga, Colombia',
    },
    {
      icon: <TimeIcon sx={{ fontSize: 40 }} />,
      title: 'Horarios',
      content: 'Lunes a Viernes',
      subtitle: '8:00 AM - 6:00 PM',
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/core/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al enviar');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Container maxWidth='lg'>
            <Typography
              variant='h2'
              component='h1'
              textAlign='center'
              gutterBottom
            >
              Contáctanos
            </Typography>
            <Typography
              variant='h5'
              component='h2'
              textAlign='center'
              sx={{ maxWidth: 800, mx: 'auto' }}
            >
              Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos
              lo antes posible.
            </Typography>
          </Container>
        </Box>
      </Fade>

      {/* Información de Contacto */}
      <Container maxWidth='lg' sx={{ py: 8 }}>
        <div ref={infoCardsReveal.ref}>
          <Grid container spacing={4}>
            {contactInfo.map((info, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow
                  in={infoCardsReveal.isVisible}
                  timeout={600 + index * 150}
                  style={{ transformOrigin: 'center bottom' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      ...CARD_HOVER_SX,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ color: 'primary.main', mb: 2 }}>
                        {info.icon}
                      </Box>
                      <Typography variant='h6' component='h3' gutterBottom>
                        {info.title}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 'bold', mb: 1 }}
                      >
                        {info.content}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {info.subtitle}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </div>
      </Container>

      {/* Formulario y Mapa */}
      <Container maxWidth='lg' sx={{ py: 8 }}>
        <div ref={formReveal.ref}>
          <Fade in={formReveal.isVisible} timeout={700}>
            <Grid container spacing={6}>
              {/* Formulario de Contacto */}
              <Grid item xs={12} md={6}>
                <Typography variant='h4' component='h2' gutterBottom>
                  Envíanos un Mensaje
                </Typography>
                <Box
                  sx={{
                    width: 48,
                    height: 4,
                    bgcolor: 'primary.main',
                    borderRadius: 2,
                    mb: 3,
                  }}
                />
                <Typography variant='body1' paragraph color='text.secondary'>
                  Completa el formulario y nos pondremos en contacto contigo en
                  las próximas 24 horas.
                </Typography>

                <Paper sx={{ p: 4, mt: 3 }}>
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label='Nombre completo'
                          name='name'
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label='Email'
                          name='email'
                          type='email'
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label='Asunto'
                          name='subject'
                          value={formData.subject}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label='Mensaje'
                          name='message'
                          multiline
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {submitStatus === 'success' && (
                          <Alert severity='success' sx={{ mb: 2 }}>
                            ¡Mensaje enviado exitosamente! Te responderemos
                            pronto.
                          </Alert>
                        )}
                        {submitStatus === 'error' && (
                          <Alert severity='error' sx={{ mb: 2 }}>
                            Hubo un error al enviar el mensaje. Por favor,
                            intenta nuevamente.
                          </Alert>
                        )}
                        <Button
                          type='submit'
                          variant='contained'
                          size='large'
                          startIcon={<SendIcon />}
                          disabled={isSubmitting}
                          fullWidth
                        >
                          {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Paper>
              </Grid>

              {/* Información Adicional */}
              <Grid item xs={12} md={6}>
                <Typography variant='h4' component='h2' gutterBottom>
                  Información Adicional
                </Typography>
                <Box
                  sx={{
                    width: 48,
                    height: 4,
                    bgcolor: 'primary.main',
                    borderRadius: 2,
                    mb: 3,
                  }}
                />

                <Card sx={{ mb: 3, ...CARD_HOVER_SX }}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Soporte Técnico
                    </Typography>
                    <Typography variant='body2' paragraph>
                      Para problemas técnicos o consultas sobre la plataforma,
                      contacta a nuestro equipo de soporte.
                    </Typography>
                    <Typography variant='body2' color='primary.main'>
                      soporte@verihome.com
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, ...CARD_HOVER_SX }}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Ventas y Asociaciones
                    </Typography>
                    <Typography variant='body2' paragraph>
                      Para oportunidades comerciales, asociaciones o consultas
                      sobre nuestros servicios empresariales.
                    </Typography>
                    <Typography variant='body2' color='primary.main'>
                      ventas@verihome.com
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ ...CARD_HOVER_SX }}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Preguntas Frecuentes
                    </Typography>
                    <Typography variant='body2' paragraph>
                      Encuentra respuestas rápidas a las preguntas más comunes
                      en nuestra sección de FAQ.
                    </Typography>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => navigate('/help')}
                    >
                      Ver FAQ
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Fade>
        </div>
      </Container>

      {/* Mapa o Ubicación */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth='lg'>
          <div ref={mapReveal.ref}>
            <Fade in={mapReveal.isVisible} timeout={700}>
              <Box>
                <Typography
                  variant='h4'
                  component='h2'
                  textAlign='center'
                  gutterBottom
                >
                  Nuestra Ubicación
                </Typography>
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
                <Typography
                  variant='body1'
                  textAlign='center'
                  sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
                >
                  Visítanos en nuestras oficinas centrales para una atención
                  personalizada.
                </Typography>

                <Paper sx={{ p: 2, overflow: 'hidden' }}>
                  <Box
                    component='iframe'
                    src={googleMapsEmbedUrl}
                    sx={{
                      width: '100%',
                      height: 400,
                      border: 0,
                      borderRadius: 1,
                      display: 'block',
                    }}
                    loading='lazy'
                    referrerPolicy='no-referrer-when-downgrade'
                    title='Ubicación VeriHome - Bucaramanga'
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 1,
                      mt: 2,
                    }}
                  >
                    <Typography variant='body1'>
                      Calle 13 # 28-42, San Alonso, Bucaramanga, Colombia
                    </Typography>
                    <Button
                      size='small'
                      variant='outlined'
                      endIcon={<OpenInNewIcon />}
                      href={googleMapsLinkUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Abrir en Google Maps
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Fade>
          </div>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

export default ContactPage;
