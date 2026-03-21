import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Divider,
  Fade,
} from '@mui/material';
import {
  Home as HomeIcon,
  Storefront as StorefrontIcon,
  AdminPanelSettings as AdminIcon,
  Handyman as HandymanIcon,
  Shield as ShieldIcon,
  PersonSearch as PersonSearchIcon,
  Fingerprint as FingerprintIcon,
  Description as DescriptionIcon,
  Groups as GroupsIcon,
  CleaningServices as CleaningIcon,
  Balance as BalanceIcon,
  Yard as YardIcon,
  FormatPaint as PaintIcon,
  ArrowForward as ArrowForwardIcon,
  Build,
  Assessment,
  Star,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useScrollReveal } from '../hooks/useScrollReveal';

const RevealContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      {children}
    </div>
  );
};

const CARD_HOVER = {
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
};

const BlueDivider = () => (
  <Box sx={{ width: 48, height: 4, bgcolor: 'primary.main', borderRadius: 2, mx: 'auto', mb: 4 }} />
);

const StepCards: React.FC<{ steps: { icon: React.ReactNode; title: string; desc: string }[] }> = ({ steps }) => (
  <Grid container spacing={3} sx={{ mt: 2 }}>
    {steps.map((s, i) => (
      <Grid item xs={12} md={4} key={i}>
        <Box sx={{ textAlign: 'center', px: 2 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
            {s.icon}
          </Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 2 }}>Paso {i + 1}</Typography>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mt: 0.5, mb: 1 }}>{s.title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{s.desc}</Typography>
        </Box>
      </Grid>
    ))}
  </Grid>
);

// Testimonios
const testimonials = [
  { name: 'Ricardo Vargas', role: 'Arrendador', text: 'VeriHome transform\u00f3 la forma en que gestiono mis propiedades. La verificaci\u00f3n de arrendatarios me da una tranquilidad que antes no ten\u00eda.', rating: 5 },
  { name: 'Patricia Salazar', role: 'Arrendataria', text: 'Encontr\u00e9 apartamento en 3 d\u00edas. El contrato digital con firma biom\u00e9trica es incre\u00edblemente profesional y seguro.', rating: 5 },
  { name: 'Fernando Castro', role: 'Electricista', text: 'Como prestador de servicios, VeriHome me conecta con clientes serios y verificados. Mis ingresos aumentaron un 40%.', rating: 5 },
  { name: 'Ana Mart\u00ednez', role: 'Propietaria', text: 'Dej\u00e9 mis dos apartamentos en administraci\u00f3n y no he tenido un solo problema. Los reportes mensuales son claros y puntuales.', rating: 5 },
  { name: 'Diego Herrera', role: 'Abogado inmobiliario', text: 'La calidad de los contratos que genera VeriHome cumple con todos los est\u00e1ndares legales colombianos. Recomiendo la plataforma.', rating: 5 },
  { name: 'Camila Ortiz', role: 'Arrendataria', text: 'Me sent\u00ed segura durante todo el proceso. Saber que el arrendador est\u00e1 verificado y que el contrato tiene validez legal es invaluable.', rating: 5 },
];

const TestimonialCarousel: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    timer.current = setInterval(() => setIdx((p) => (p + 1) % testimonials.length), 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);
  const t = testimonials[idx];
  if (!t) return null;
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', textAlign: 'center', py: 4 }}>
      <Fade in key={idx} timeout={600}>
        <Box>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.8, mb: 3, fontSize: '1.05rem' }}>
            &ldquo;{t.text}&rdquo;
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} sx={{ fontSize: 20, color: s <= t.rating ? '#eab308' : 'grey.300' }} />)}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>{t.name}</Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>{t.role}</Typography>
        </Box>
      </Fade>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
        {testimonials.map((_, i) => (
          <Box key={i} onClick={() => setIdx(i)} sx={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, bgcolor: i === idx ? 'primary.main' : 'grey.300', transition: 'all 0.3s ease', cursor: 'pointer' }} />
        ))}
      </Box>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const ServicesOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to hash on load
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(t);
  }, [location.hash]);

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
      <LandingNavbar />

      {/* HERO */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white', pt: 14, pb: 8 }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
            Nuestros Servicios
          </Typography>
          <Typography variant="h5" sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.7, opacity: 0.9 }}>
            Una plataforma integral que conecta arrendadores, arrendatarios y profesionales verificados en Colombia.
          </Typography>
        </Container>
      </Box>

      {/* ARRENDAMIENTO */}
      <RevealContainer><Box id="arrendamiento" sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <HomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Arrendamiento Inteligente</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
              VeriHome conecta arrendadores con arrendatarios verificados a trav&eacute;s de un proceso transparente, seguro y legalmente respaldado. Cada parte del proceso est&aacute; dise&ntilde;ado para generar confianza.
            </Typography>
          </Box>
          <StepCards steps={[
            { icon: <PersonSearchIcon sx={{ fontSize: 28, color: 'white' }} />, title: 'Matching inteligente', desc: 'Nuestro sistema conecta arrendadores con arrendatarios que cumplen los requisitos: verificaci\u00f3n de identidad, historial crediticio y referencias.' },
            { icon: <DescriptionIcon sx={{ fontSize: 28, color: 'white' }} />, title: 'Contrato digital seguro', desc: 'Contratos conformes a la Ley 820 de 2003, generados autom\u00e1ticamente con cl\u00e1usulas din\u00e1micas, ajuste IPC y firma digital.' },
            { icon: <FingerprintIcon sx={{ fontSize: 28, color: 'white' }} />, title: 'Autenticaci\u00f3n biom\u00e9trica', desc: 'Firma de contratos con verificaci\u00f3n facial, dactilar y de voz. 5 pasos de autenticaci\u00f3n que garantizan la identidad de cada firmante.' },
          ]} />
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/register')} endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 600 }}>Comenzar a arrendar</Button>
          </Box>
        </Container>
      </Box></RevealContainer>

      <Divider />

      {/* VENTA */}
      <RevealContainer><Box id="venta" sx={{ bgcolor: '#f8fafc', py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <StorefrontIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Venta de Inmuebles</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
              Tu propiedad merece compradores serios. VeriHome es la catapulta para encontrar compradores certificados y verificados que cumplan con todas las calidades.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              { title: 'Compradores verificados', desc: 'Cada comprador pasa por verificaci\u00f3n de identidad, antecedentes y capacidad financiera antes de poder contactar al vendedor.' },
              { title: 'Visibilidad profesional', desc: 'Publica tu propiedad con fotos de alta calidad, videos, ubicaci\u00f3n en mapa y documentaci\u00f3n legal verificada.' },
              { title: 'Proceso acompa\u00f1ado', desc: 'Desde la publicaci\u00f3n hasta la firma de la escritura, cada paso est\u00e1 documentado y respaldado por nuestra plataforma.' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/register')} endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 600 }}>Publicar mi propiedad</Button>
          </Box>
        </Container>
      </Box></RevealContainer>

      <Divider />

      {/* ADMINISTRACION */}
      <RevealContainer><Box id="administracion" sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <AdminIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Administraci\u00f3n de Inmuebles</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
              Deja tu inmueble en manos expertas. Bajo la modalidad de dep\u00f3sito, VeriHome administra tus propiedades, gestiona arrendatarios, cobra arriendos y genera usufructo.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              { title: 'Dep\u00f3sito de inmuebles', desc: 'Entrega la gesti\u00f3n completa de tu propiedad: publicaci\u00f3n, selecci\u00f3n de arrendatarios, cobro de arriendos y mantenimiento.' },
              { title: 'Gesti\u00f3n integral', desc: 'Contratos, pagos, reportes financieros, coordinaci\u00f3n de mantenimientos y atenci\u00f3n al arrendatario, todo gestionado por VeriHome.' },
              { title: 'Transparencia total', desc: 'Accede en tiempo real al estado de tu propiedad, hist\u00f3rico de pagos, reportes de ocupaci\u00f3n y rendimiento desde tu dashboard.' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/contact')} endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 600 }}>Solicitar administraci\u00f3n</Button>
          </Box>
        </Container>
      </Box></RevealContainer>

      <Divider />

      {/* SERVICIOS PROFESIONALES */}
      <RevealContainer><Box id="servicios-profesionales" sx={{ bgcolor: '#f8fafc', py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <HandymanIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Servicios Profesionales Verificados</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
              Todos los profesionales en VeriHome pasan por los mismos requisitos de autenticaci\u00f3n y verificaci\u00f3n. Conf\u00eda en personas honestas, calificadas y respaldadas por nuestra comunidad.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {[
              { icon: <Build sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Mantenimiento', desc: 'Plomeros, electricistas, t\u00e9cnicos de aires acondicionados, cerrajeros y m\u00e1s. Todos verificados y calificados.' },
              { icon: <CleaningIcon sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Empleadas dom\u00e9sticas', desc: 'Personal de limpieza con referencias verificadas, antecedentes limpios y calificaciones de empleadores anteriores.' },
              { icon: <BalanceIcon sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Abogados', desc: 'Especialistas en derecho inmobiliario, contratos de arrendamiento, propiedad horizontal y resoluci\u00f3n de conflictos.' },
              { icon: <Assessment sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Contadores', desc: 'Profesionales contables para declaraci\u00f3n de renta, impuesto predial y gesti\u00f3n tributaria inmobiliaria.' },
              { icon: <YardIcon sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Jardineros', desc: 'Mantenimiento de jardines, zonas verdes, terrazas y espacios exteriores con servicio peri\u00f3dico programable.' },
              { icon: <PaintIcon sx={{ fontSize: 32, color: 'primary.main' }} />, title: 'Pintores y remodeladores', desc: 'Pintura, remodelaciones menores y adecuaciones locativas con presupuestos transparentes y calificaciones verificables.' },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/register')} endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 600 }}>Explorar servicios</Button>
          </Box>
        </Container>
      </Box></RevealContainer>

      <Divider />

      {/* SEGUROS */}
      <RevealContainer><Box id="seguros" sx={{ py: { xs: 8, md: 10 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <ShieldIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Seguros Inmobiliarios</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
              Protege tu inversi\u00f3n con seguros especializados ofrecidos por vendedores verificados dentro de nuestra plataforma.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              { title: 'Seguro de arrendamiento', desc: 'Protecci\u00f3n contra incumplimiento de pago, da\u00f1os a la propiedad y gastos legales de desalojo.' },
              { title: 'Seguro de propiedad', desc: 'Cobertura integral contra incendio, inundaci\u00f3n, terremoto y robo. P\u00f3lizas personalizadas seg\u00fan tu inmueble.' },
              { title: 'Asesores certificados', desc: 'Vendedores de seguros verificados, con calificaciones reales de otros usuarios y trayectoria comprobable.' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ height: '100%', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{item.desc}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/contact')} endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 600 }}>Cotizar seguros</Button>
          </Box>
        </Container>
      </Box></RevealContainer>

      <Divider />

      {/* PROFESIONALES DESTACADOS + TESTIMONIOS */}
      <RevealContainer><Box sx={{ bgcolor: '#f8fafc', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <GroupsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>Profesionales Destacados</Typography>
            <BlueDivider />
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              Conoce algunos de los profesionales verificados que forman parte de nuestra comunidad.
            </Typography>
          </Box>
          <Grid container spacing={3} sx={{ mb: 8 }}>
            {[
              { name: 'Carlos Mendoza', role: 'Electricista certificado', rating: 4.9, jobs: 127, initials: 'CM' },
              { name: 'Mar\u00eda Rojas', role: 'Abogada inmobiliaria', rating: 5.0, jobs: 84, initials: 'MR' },
              { name: 'Andr\u00e9s Pe\u00f1a', role: 'Plomero profesional', rating: 4.8, jobs: 203, initials: 'AP' },
              { name: 'Laura G\u00f3mez', role: 'Contadora tributaria', rating: 4.9, jobs: 156, initials: 'LG' },
            ].map((p, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card sx={{ textAlign: 'center', ...CARD_HOVER }}><CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '1.2rem', fontWeight: 700 }}>{p.initials}</Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500, mb: 1 }}>{p.role}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} sx={{ fontSize: 18, color: s <= Math.round(p.rating) ? '#eab308' : 'grey.300' }} />)}
                    <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>{p.rating}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.jobs} trabajos completados</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 700, mb: 1 }}>Lo que dicen nuestros usuarios</Typography>
          <BlueDivider />
          <TestimonialCarousel />
        </Container>
      </Box></RevealContainer>

      {/* CTA FINAL */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
              ¿Listo para ser parte de VeriHome?
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4, maxWidth: 500, mx: 'auto', lineHeight: 1.7 }}>
              Reg&iacute;strate y accede a una comunidad verificada de arrendadores, arrendatarios y profesionales de confianza.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" size="large" onClick={() => navigate('/register')} sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: 'grey.100' } }}>
                Registrarme gratis
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/contact')} sx={{ borderColor: 'white', color: 'white', fontWeight: 600, '&:hover': { borderColor: 'grey.100', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                Contactar equipo
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

export default ServicesOverviewPage;
