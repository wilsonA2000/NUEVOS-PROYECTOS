import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';
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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <RevealBlock>
    <Box sx={{ mb: 5 }}>
      <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}>{title}</Typography>
      {children}
    </Box>
  </RevealBlock>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2, textAlign: 'justify' }}>{children}</Typography>
);

const TermsPage: React.FC = () => (
  <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
    <LandingNavbar />

    <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white', pt: 14, pb: 8 }}>
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <Typography variant="h2" component="h1" sx={{ fontWeight: 800, mb: 2 }}>T&eacute;rminos y Condiciones</Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
          Condiciones generales de uso de la plataforma VeriHome
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.7 }}>
          &Uacute;ltima actualizaci&oacute;n: 20 de marzo de 2026
        </Typography>
      </Container>
    </Box>

    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Section title="1. Aceptaci&oacute;n de los T&eacute;rminos">
        <P>Al acceder y utilizar la plataforma VeriHome (en adelante &ldquo;la Plataforma&rdquo;), usted acepta cumplir y estar sujeto a los presentes T&eacute;rminos y Condiciones de uso. Si no est&aacute; de acuerdo con alguna parte de estos t&eacute;rminos, no deber&aacute; utilizar la Plataforma.</P>
        <P>VeriHome se reserva el derecho de modificar estos t&eacute;rminos en cualquier momento, notificando a los usuarios registrados por correo electr&oacute;nico y publicando la versi&oacute;n actualizada en esta p&aacute;gina.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="2. Descripci&oacute;n del Servicio">
        <P>VeriHome es una plataforma tecnol&oacute;gica que conecta arrendadores, arrendatarios y prestadores de servicios en el sector inmobiliario colombiano. La Plataforma ofrece:</P>
        <P>&bull; Publicaci&oacute;n y b&uacute;squeda de propiedades verificadas en Colombia.</P>
        <P>&bull; Sistema de matching inteligente entre arrendadores y arrendatarios verificados.</P>
        <P>&bull; Generaci&oacute;n de contratos digitales conformes a la Ley 820 de 2003 con firma biom&eacute;trica.</P>
        <P>&bull; Marketplace de servicios profesionales verificados (mantenimiento, asesor&iacute;a legal, contable, seguros).</P>
        <P>&bull; Sistema de calificaciones y reputaci&oacute;n entre usuarios.</P>
        <P>&bull; Mensajer&iacute;a en tiempo real entre las partes.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="3. Registro y Verificaci&oacute;n de Usuarios">
        <P>Para utilizar los servicios de VeriHome, los usuarios deben registrarse proporcionando informaci&oacute;n veraz y completa. El proceso de verificaci&oacute;n incluye:</P>
        <P>&bull; Verificaci&oacute;n de identidad mediante documento colombiano (c&eacute;dula de ciudadan&iacute;a, c&eacute;dula de extranjer&iacute;a o pasaporte).</P>
        <P>&bull; Validaci&oacute;n de datos de contacto (correo electr&oacute;nico y tel&eacute;fono).</P>
        <P>&bull; Para prestadores de servicios: verificaci&oacute;n de credenciales profesionales y antecedentes.</P>
        <P>El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda actividad que ocurra bajo su cuenta.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="4. Contratos Digitales y Autenticaci&oacute;n Biom&eacute;trica">
        <P>VeriHome genera contratos de arrendamiento digitales con validez legal conforme a la legislaci&oacute;n colombiana. La firma de contratos requiere autenticaci&oacute;n biom&eacute;trica de 5 pasos:</P>
        <P>&bull; Captura facial (frontal y lateral).</P>
        <P>&bull; Verificaci&oacute;n de documento de identidad.</P>
        <P>&bull; Verificaci&oacute;n combinada (documento + rostro).</P>
        <P>&bull; Grabaci&oacute;n de voz con frase contractual.</P>
        <P>&bull; Firma digital manuscrita.</P>
        <P>Los datos biom&eacute;tricos se procesan exclusivamente para la validaci&oacute;n contractual y se almacenan de forma encriptada conforme a la Ley 1581 de 2012 de protecci&oacute;n de datos personales.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="5. Obligaciones de los Usuarios">
        <P>&bull; Proporcionar informaci&oacute;n veraz, completa y actualizada.</P>
        <P>&bull; No publicar propiedades de las cuales no se tenga titularidad o autorizaci&oacute;n legal.</P>
        <P>&bull; Respetar los derechos de otros usuarios y mantener una comunicaci&oacute;n respetuosa.</P>
        <P>&bull; Cumplir con las obligaciones contractuales derivadas de los contratos firmados en la Plataforma.</P>
        <P>&bull; No utilizar la Plataforma para actividades il&iacute;citas, fraudulentas o contrarias a la ley colombiana.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="6. Propiedad Intelectual">
        <P>Todo el contenido de la Plataforma, incluyendo pero no limitado a software, dise&ntilde;o, textos, gr&aacute;ficos, logos, iconos e im&aacute;genes, es propiedad exclusiva de VeriHome o de sus licenciantes y est&aacute; protegido por las leyes de propiedad intelectual colombianas e internacionales.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="7. Limitaci&oacute;n de Responsabilidad">
        <P>VeriHome act&uacute;a como intermediario tecnol&oacute;gico y no es parte en las transacciones inmobiliarias entre usuarios. La Plataforma no garantiza la solvencia de los arrendatarios, el estado de las propiedades ni la calidad de los servicios prestados por terceros, aunque implementa procesos de verificaci&oacute;n rigurosos para minimizar riesgos.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="8. Legislaci&oacute;n Aplicable">
        <P>Los presentes T&eacute;rminos y Condiciones se rigen por las leyes de la Rep&uacute;blica de Colombia, en particular:</P>
        <P>&bull; Ley 820 de 2003 &mdash; R&eacute;gimen de arrendamiento de vivienda urbana.</P>
        <P>&bull; Ley 1581 de 2012 &mdash; Protecci&oacute;n de datos personales.</P>
        <P>&bull; Ley 527 de 1999 &mdash; Comercio electr&oacute;nico y firma digital.</P>
        <P>&bull; Decreto 1377 de 2013 &mdash; Reglamentaci&oacute;n de datos personales.</P>
        <P>Para cualquier controversia derivada del uso de la Plataforma, las partes se someten a los tribunales competentes de la ciudad de Bucaramanga, Santander, Colombia.</P>
      </Section>

      <Divider sx={{ mb: 5 }} />

      <Section title="9. Contacto">
        <P>Para consultas sobre estos T&eacute;rminos y Condiciones, puede comunicarse con nosotros a trav&eacute;s de:</P>
        <P>&bull; Correo electr&oacute;nico: legal@verihome.com</P>
        <P>&bull; Tel&eacute;fono: +57 (7) 123-4567</P>
        <P>&bull; Direcci&oacute;n: Calle 13 #28-42, San Alonso, Bucaramanga, Colombia</P>
      </Section>
    </Container>

    <LandingFooter />
  </Box>
);

export default TermsPage;
