import React from 'react';
import {
  Box,
  Container,
  Typography,
  Divider,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Lock as LockIcon,
  Storage as StorageIcon,
  Share as ShareIcon,
  DeleteForever as DeleteIcon,
  Fingerprint as FingerprintIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import LandingNavbar from '../components/layout/LandingNavbar';
import LandingFooter from '../components/layout/LandingFooter';
import { useScrollReveal } from '../hooks/useScrollReveal';

const RevealBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {children}
    </div>
  );
};

const BlueDivider = () => (
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

const CARD_HOVER = {
  transition:
    'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <RevealBlock>
    <Box sx={{ mb: 5 }}>
      <Typography
        variant='h5'
        sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  </RevealBlock>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant='body1'
    sx={{
      color: 'text.secondary',
      lineHeight: 1.8,
      mb: 2,
      textAlign: 'justify',
    }}
  >
    {children}
  </Typography>
);

const PrivacyPage: React.FC = () => (
  <Box sx={{ bgcolor: 'background.paper', minHeight: '100vh' }}>
    <LandingNavbar />

    <Box
      sx={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        color: 'white',
        pt: 14,
        pb: 8,
      }}
    >
      <Container maxWidth='lg' sx={{ textAlign: 'center' }}>
        <Typography variant='h2' component='h1' sx={{ fontWeight: 800, mb: 2 }}>
          Pol&iacute;tica de Privacidad
        </Typography>
        <Typography
          variant='h6'
          sx={{ opacity: 0.9, maxWidth: 650, mx: 'auto' }}
        >
          C&oacute;mo recopilamos, usamos y protegemos tus datos personales
        </Typography>
        <Typography
          variant='caption'
          sx={{ display: 'block', mt: 2, opacity: 0.7 }}
        >
          &Uacute;ltima actualizaci&oacute;n: 20 de marzo de 2026 &mdash;
          Conforme a la Ley 1581 de 2012
        </Typography>
      </Container>
    </Box>

    {/* PRINCIPIOS CLAVE */}
    <RevealBlock>
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant='h3'
              sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
            >
              Nuestros Principios de Privacidad
            </Typography>
            <BlueDivider />
            <Typography
              variant='body1'
              sx={{
                color: 'text.secondary',
                maxWidth: 650,
                mx: 'auto',
                lineHeight: 1.7,
              }}
            >
              En VeriHome, tus datos personales son de uso exclusivo de la
              plataforma. Jam&aacute;s vendemos, compartimos ni cedemos tu
              informaci&oacute;n a terceros sin tu consentimiento
              expl&iacute;cito.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              {
                icon: <LockIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
                title: 'Uso exclusivo VeriHome',
                desc: 'Tus datos se utilizan \u00fanicamente para operar la plataforma, verificar tu identidad y mejorar tu experiencia. Nunca se venden ni comparten con fines comerciales de terceros.',
              },
              {
                icon: (
                  <StorageIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                ),
                title: 'Almacenamiento seguro',
                desc: 'Toda la informaci\u00f3n se almacena en servidores con encriptaci\u00f3n AES-256 en reposo y TLS 1.3 en tr\u00e1nsito. Acceso restringido solo a personal autorizado.',
              },
              {
                icon: (
                  <ShareIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                ),
                title: 'Sin compartir con terceros',
                desc: 'VeriHome no comparte, vende ni transfiere datos personales a empresas externas, redes publicitarias ni data brokers. Tu informaci\u00f3n es tuya.',
              },
              {
                icon: (
                  <DeleteIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                ),
                title: 'Derecho al olvido',
                desc: 'Puedes solicitar la eliminaci\u00f3n completa de tus datos en cualquier momento. Procesamos solicitudes de eliminaci\u00f3n en un m\u00e1ximo de 15 d\u00edas h\u00e1biles.',
              },
              {
                icon: (
                  <FingerprintIcon
                    sx={{ fontSize: 40, color: 'primary.main' }}
                  />
                ),
                title: 'Datos biom\u00e9tricos protegidos',
                desc: 'Los datos biom\u00e9tricos de firma contractual se encriptan con est\u00e1ndares bancarios y se usan exclusivamente para validaci\u00f3n de contratos. No se usan para ning\u00fan otro fin.',
              },
              {
                icon: (
                  <GavelIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                ),
                title: 'Cumplimiento legal',
                desc: 'Cumplimos integralmente con la Ley 1581 de 2012 de Protecci\u00f3n de Datos Personales y el Decreto 1377 de 2013. Registrados ante la SIC como responsables de tratamiento.',
              },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{ height: '100%', ...CARD_HOVER }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ mb: 2 }}>{item.icon}</Box>
                    <Typography
                      variant='h6'
                      sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', lineHeight: 1.7 }}
                    >
                      {item.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </RevealBlock>

    <Divider />

    {/* DETALLE DE LA POLITICA */}
    <Container maxWidth='md' sx={{ py: { xs: 6, md: 10 } }}>
      <Section title='1. Responsable del Tratamiento'>
        <P>
          VeriHome S.A.S., con domicilio en Calle 13 #28-42, San Alonso,
          Bucaramanga, Santander, Colombia, es el responsable del tratamiento de
          los datos personales recopilados a trav&eacute;s de la plataforma.
        </P>
        <P>
          Correo del Oficial de Protecci&oacute;n de Datos:
          privacidad@verihome.com
        </P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title='2. Datos que Recopilamos'>
        <P>
          <strong>Datos de identificaci&oacute;n:</strong> Nombre completo,
          n&uacute;mero de documento de identidad, fecha de nacimiento,
          direcci&oacute;n, tel&eacute;fono y correo electr&oacute;nico.
        </P>
        <P>
          <strong>Datos financieros:</strong> Informaci&oacute;n de ingresos y
          referencias laborales proporcionadas voluntariamente para el proceso
          de matching con arrendadores.
        </P>
        <P>
          <strong>Datos biom&eacute;tricos:</strong> Captura facial, huella de
          voz y firma digital, recopilados exclusivamente durante el proceso de
          firma de contratos.
        </P>
        <P>
          <strong>Datos de uso:</strong> Informaci&oacute;n de
          navegaci&oacute;n, dispositivo, direcci&oacute;n IP y preferencias de
          b&uacute;squeda para mejorar la experiencia del usuario.
        </P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title='3. Finalidad del Tratamiento'>
        <P>Los datos personales se tratan exclusivamente para:</P>
        <P>
          &bull; Verificaci&oacute;n de identidad y creaci&oacute;n de perfiles
          confiables.
        </P>
        <P>
          &bull; Conexi&oacute;n entre arrendadores y arrendatarios mediante
          matching inteligente.
        </P>
        <P>
          &bull; Generaci&oacute;n y firma de contratos digitales con validez
          legal.
        </P>
        <P>
          &bull; Comunicaci&oacute;n de notificaciones relacionadas con el
          servicio.
        </P>
        <P>
          &bull; Mejora continua de la plataforma y experiencia del usuario.
        </P>
        <P>&bull; Cumplimiento de obligaciones legales y regulatorias.</P>
        <P>
          VeriHome <strong>NO</strong> utiliza datos personales para publicidad
          de terceros, perfilamiento comercial externo ni venta de
          informaci&oacute;n.
        </P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title='4. Derechos del Titular (ARCO)'>
        <P>Conforme a la Ley 1581 de 2012, usted tiene derecho a:</P>
        <P>
          &bull; <strong>Acceso:</strong> Conocer qu&eacute; datos personales
          suyos tenemos almacenados.
        </P>
        <P>
          &bull; <strong>Rectificaci&oacute;n:</strong> Solicitar la
          correcci&oacute;n de datos inexactos o incompletos.
        </P>
        <P>
          &bull; <strong>Cancelaci&oacute;n:</strong> Solicitar la
          eliminaci&oacute;n de sus datos cuando ya no sean necesarios.
        </P>
        <P>
          &bull; <strong>Oposici&oacute;n:</strong> Oponerse al tratamiento de
          sus datos para fines espec&iacute;ficos.
        </P>
        <P>
          Para ejercer estos derechos, escriba a privacidad@verihome.com con el
          asunto &ldquo;Derechos ARCO&rdquo; adjuntando copia de su documento de
          identidad. Responderemos en un plazo m&aacute;ximo de 15 d&iacute;as
          h&aacute;biles.
        </P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title='5. Conservaci&oacute;n de Datos'>
        <P>
          Los datos personales se conservan durante el tiempo que dure la
          relaci&oacute;n contractual y hasta 5 a&ntilde;os despu&eacute;s de su
          finalizaci&oacute;n, conforme a las obligaciones legales de
          conservaci&oacute;n documental en Colombia.
        </P>
        <P>
          Los datos biom&eacute;tricos de firma contractual se conservan durante
          la vigencia del contrato y 2 a&ntilde;os adicionales como soporte
          probatorio.
        </P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title='6. Contacto'>
        <P>
          Para cualquier consulta sobre esta pol&iacute;tica, comun&iacute;quese
          con:
        </P>
        <P>
          &bull; Oficial de Protecci&oacute;n de Datos: privacidad@verihome.com
        </P>
        <P>&bull; Tel&eacute;fono: +57 (7) 123-4567</P>
        <P>
          &bull; Direcci&oacute;n: Calle 13 #28-42, San Alonso, Bucaramanga,
          Colombia
        </P>
        <P>
          &bull; Superintendencia de Industria y Comercio (SIC): www.sic.gov.co
        </P>
      </Section>
    </Container>

    <LandingFooter />
  </Box>
);

export default PrivacyPage;
