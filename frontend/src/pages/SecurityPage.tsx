import React from 'react';
import { Box, Container, Typography, Divider, Grid, Card, CardContent } from '@mui/material';
import {
  Shield as ShieldIcon,
  Lock as LockIcon,
  Fingerprint as FingerprintIcon,
  VerifiedUser as VerifiedUserIcon,
  Security as SecurityIcon,
  Https as HttpsIcon,
  CloudDone as CloudIcon,
  Visibility as VisibilityIcon,
  Policy as PolicyIcon,
  SupportAgent as SupportIcon,
  BugReport as BugIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useScrollReveal } from '../hooks/useScrollReveal';

const RevealBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      {children}
    </div>
  );
};

const BlueDivider = () => (
  <Box sx={{ width: 48, height: 4, bgcolor: 'primary.main', borderRadius: 2, mx: 'auto', mb: 4 }} />
);

const CARD_HOVER = {
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
};

const SecurityPage: React.FC = () => (
  <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
    <LandingNavbar />

    <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white', pt: 14, pb: 8 }}>
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <ShieldIcon sx={{ fontSize: 56, mb: 2 }} />
        <Typography variant="h2" component="h1" sx={{ fontWeight: 800, mb: 2 }}>Seguridad en VeriHome</Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 700, mx: 'auto' }}>
          Tu seguridad es nuestra prioridad absoluta. Conoce las medidas que implementamos para proteger tu informaci&oacute;n, tus transacciones y tu confianza.
        </Typography>
      </Container>
    </Box>

    {/* PILARES DE SEGURIDAD */}
    <RevealBlock>
    <Box sx={{ py: { xs: 8, md: 10 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Entorno 100% Seguro</Typography>
          <BlueDivider />
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
            Cada capa de VeriHome est&aacute; dise&ntilde;ada con seguridad en mente. Desde el registro hasta la firma de contratos, cada interacci&oacute;n est&aacute; protegida.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {[
            { icon: <LockIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Encriptaci\u00f3n de grado bancario', desc: 'Toda la informaci\u00f3n se transmite con TLS 1.3 (el mismo est\u00e1ndar que usan los bancos) y se almacena con encriptaci\u00f3n AES-256. Tus datos est\u00e1n protegidos en tr\u00e1nsito y en reposo.' },
            { icon: <FingerprintIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Autenticaci\u00f3n biom\u00e9trica de 5 pasos', desc: 'Verificaci\u00f3n facial, dactilar y de voz para firmar contratos. Es imposible suplantar la identidad de un firmante. Cada paso genera un score de confianza validado por inteligencia artificial.' },
            { icon: <VerifiedUserIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Usuarios 100% verificados', desc: 'Ning\u00fan usuario puede interactuar en la plataforma sin pasar por verificaci\u00f3n de identidad con documento colombiano. Arrendadores, arrendatarios y prestadores de servicios: todos verificados.' },
            { icon: <HttpsIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Conexiones seguras HTTPS', desc: 'Toda la comunicaci\u00f3n con nuestros servidores est\u00e1 protegida por certificados SSL/TLS. Nunca se transmite informaci\u00f3n sensible por canales no encriptados.' },
            { icon: <CloudIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Infraestructura redundante', desc: 'Servidores con respaldo autom\u00e1tico, recuperaci\u00f3n ante desastres y monitoreo 24/7. Tu informaci\u00f3n est\u00e1 disponible cuando la necesites, con copias de seguridad diarias.' },
            { icon: <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Control de acceso granular', desc: 'Cada rol (arrendador, arrendatario, proveedor, administrador) tiene permisos espec\u00edficos. Nadie accede a informaci\u00f3n que no le corresponde. Auditor\u00eda completa de accesos.' },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                <Box sx={{ mb: 2 }}>{item.icon}</Box>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{item.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
    </RevealBlock>

    <Divider />

    {/* CONFIANZA */}
    <RevealBlock>
    <Box sx={{ bgcolor: '#f8fafc', py: { xs: 8, md: 10 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>&iquest;Por qu&eacute; confiar en VeriHome?</Typography>
          <BlueDivider />
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
            La confianza se construye con hechos, no con palabras. Estas son las garant&iacute;as concretas que ofrecemos a cada usuario de nuestra plataforma.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {[
            { icon: <VisibilityIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Transparencia total', desc: 'Cada acci\u00f3n en la plataforma queda registrada: publicaciones, mensajes, pagos, firmas. Tanto arrendadores como arrendatarios tienen acceso a su historial completo de actividad.' },
            { icon: <PolicyIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Contratos con respaldo legal', desc: 'Los contratos generados en VeriHome cumplen con la Ley 820 de 2003 y la Ley 527 de 1999 de comercio electr\u00f3nico. Tienen la misma validez que un contrato firmado ante notario.' },
            { icon: <SupportIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Soporte humano real', desc: 'Detr\u00e1s de la tecnolog\u00eda hay un equipo real en Bucaramanga, Colombia. Atendemos consultas por correo, tel\u00e9fono y chat. Respondemos en menos de 24 horas.' },
            { icon: <BugIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Monitoreo continuo', desc: 'Nuestros sistemas de seguridad detectan actividad sospechosa en tiempo real: intentos de acceso no autorizados, comportamientos inusuales y posibles fraudes. Actuamos antes de que ocurran problemas.' },
            { icon: <UpdateIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Actualizaciones constantes', desc: 'Mantenemos la plataforma actualizada con los \u00faltimos parches de seguridad y mejores pr\u00e1cticas de la industria. Auditor\u00edas de seguridad peri\u00f3dicas garantizan la solidez del sistema.' },
            { icon: <ShieldIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Comunidad protegida', desc: 'El sistema de calificaciones entre usuarios permite identificar y remover actores malintencionados. La comunidad se autoprotege y VeriHome act\u00faa ante cualquier reporte verificado.' },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                <Box sx={{ mb: 2 }}>{item.icon}</Box>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{item.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
    </RevealBlock>

    <Divider />

    {/* ESTADISTICAS DE SEGURIDAD */}
    <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', py: { xs: 6, md: 8 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {[
            { value: '100%', label: 'Usuarios Verificados' },
            { value: 'AES-256', label: 'Encriptaci\u00f3n de Datos' },
            { value: '24/7', label: 'Monitoreo de Seguridad' },
            { value: '5 Pasos', label: 'Autenticaci\u00f3n Biom\u00e9trica' },
          ].map((stat, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: 'white', fontWeight: 800 }}>{stat.value}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5, fontWeight: 500 }}>{stat.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    <LandingFooter />
  </Box>
);

export default SecurityPage;
