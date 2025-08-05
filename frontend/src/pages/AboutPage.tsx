import React from 'react';
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

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

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
            Quiénes Somos
          </Typography>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            VeriHome (VH): Donde la verificación se encuentra con el hogar
          </Typography>
        </Container>
      </Box>

      {/* Reseña Principal */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper sx={{ p: 6, mb: 6, bgcolor: 'grey.50' }}>
          <Typography variant="h4" component="h2" gutterBottom align="center">
            Nuestra Historia
          </Typography>
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
      </Container>

      {/* Misión y Visión */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h2" gutterBottom>
              Nuestra Misión
            </Typography>
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
      </Container>

      {/* Valores */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Nuestros Valores Fundamentales
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 800, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
            Estos valores guían cada decisión que tomamos y cada interacción que facilitamos en nuestra plataforma.
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {values.map((value, index) => (
              <Grid item xs={12} md={6} lg={3} key={index}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
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
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Características de la Plataforma */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          ¿Qué Hace Única a VeriHome?
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 800, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
          Nuestras características distintivas que garantizan la confianza y seguridad en cada transacción.
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%' }}>
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
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Estadísticas */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
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
        </Container>
      </Box>

      {/* Equipo */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            El Equipo Detrás de VeriHome
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto', mb: 6, fontSize: '1.1rem' }}>
            Conoce a las personas apasionadas que están transformando el sector inmobiliario colombiano.
          </Typography>
          <Grid container spacing={4}>
            {team.map((member, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ textAlign: 'center', height: '100%' }}>
                  <CardContent>
                    <Avatar
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        mx: 'auto', 
                        mb: 2,
                        bgcolor: 'primary.main'
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
        </Container>
      </Box>

      {/* CTA */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
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
      </Container>

      <LandingFooter />
    </Box>
  );
};

export default AboutPage; 