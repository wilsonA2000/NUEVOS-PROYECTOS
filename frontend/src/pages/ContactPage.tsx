import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simular envío del formulario
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aquí iría la lógica real de envío

setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error enviando formulario:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Contáctanos
          </Typography>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
          </Typography>
        </Container>
      </Box>

      {/* Información de Contacto */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {contactInfo.map((info, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {info.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {info.title}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {info.content}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {info.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Formulario y Mapa */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6}>
          {/* Formulario de Contacto */}
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h2" gutterBottom>
              Envíanos un Mensaje
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Completa el formulario y nos pondremos en contacto contigo en las próximas 24 horas.
            </Typography>

            <Paper sx={{ p: 4, mt: 3 }}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nombre completo"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Asunto"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mensaje"
                      name="message"
                      multiline
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    {submitStatus === 'success' && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        ¡Mensaje enviado exitosamente! Te responderemos pronto.
                      </Alert>
                    )}
                    {submitStatus === 'error' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        Hubo un error al enviar el mensaje. Por favor, intenta nuevamente.
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
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
            <Typography variant="h4" component="h2" gutterBottom>
              Información Adicional
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Soporte Técnico
                </Typography>
                <Typography variant="body2" paragraph>
                  Para problemas técnicos o consultas sobre la plataforma, 
                  contacta a nuestro equipo de soporte.
                </Typography>
                <Typography variant="body2" color="primary.main">
                  soporte@verihome.com
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ventas y Asociaciones
                </Typography>
                <Typography variant="body2" paragraph>
                  Para oportunidades comerciales, asociaciones o consultas 
                  sobre nuestros servicios empresariales.
                </Typography>
                <Typography variant="body2" color="primary.main">
                  ventas@verihome.com
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preguntas Frecuentes
                </Typography>
                <Typography variant="body2" paragraph>
                  Encuentra respuestas rápidas a las preguntas más comunes 
                  en nuestra sección de FAQ.
                </Typography>
                <Button variant="outlined" size="small">
                  Ver FAQ
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Mapa o Ubicación */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
            Nuestra Ubicación
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
            Visítanos en nuestras oficinas centrales para una atención personalizada.
          </Typography>
          
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ 
              height: 300, 
              bgcolor: 'grey.200', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="h6" color="text.secondary">
                Mapa Interactivo
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Calle 13 # 28-42, San Alonso, Bucaramanga, Colombia
            </Typography>
          </Paper>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

export default ContactPage; 