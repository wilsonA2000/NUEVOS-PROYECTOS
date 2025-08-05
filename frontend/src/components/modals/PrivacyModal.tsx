import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onClose, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isAtBottom);
    }
  };

  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
    }
  }, [open]);

  const handleAccept = () => {
    if (hasScrolledToBottom) {
      onAccept();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        bgcolor: '#f8f9fa'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Política de Privacidad
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        ref={contentRef}
        onScroll={handleScroll}
        sx={{ 
          p: 3,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> Esta política de privacidad está ajustada a la Ley 1581 de 2012 de Colombia. 
              Por favor lee completamente antes de aceptar.
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Última actualización: 15 de junio de 2025
          </Typography>
          
          <Chip 
            label="Ley 1581 de 2012 - Colombia" 
            color="primary" 
            variant="outlined" 
            sx={{ mb: 2 }}
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          1. Información que Recopilamos
        </Typography>
        <Typography variant="body2" paragraph>
          En <strong>VeriHome</strong>, recopilamos información personal como nombre, dirección de correo electrónico, 
          número de teléfono y, en algunos casos, información de identificación oficial para verificar su identidad.
        </Typography>
        <Typography variant="body2" paragraph>
          Los tipos de información que podemos recopilar incluyen:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            <strong>Información de identificación personal:</strong> nombre completo, dirección de correo electrónico, 
            número de teléfono, dirección postal.
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Información de verificación:</strong> copia de identificación oficial, comprobantes de domicilio, 
            información fiscal.
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Información de pago:</strong> datos de tarjetas de crédito/débito, información bancaria para transferencias.
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Información de propiedades:</strong> ubicación, características, imágenes, documentos legales.
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Información de uso:</strong> cómo interactúa con nuestra plataforma, preferencias, historial de búsqueda.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          2. Finalidad del Tratamiento de Datos
        </Typography>
        <Typography variant="body2" paragraph>
          Sus datos personales serán utilizados para las siguientes finalidades:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Facilitar la conexión entre arrendadores, arrendatarios y prestadores de servicios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Procesar pagos y transacciones relacionadas con nuestros servicios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Verificar la identidad de los usuarios para garantizar la seguridad de la plataforma
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Enviar comunicaciones relacionadas con el servicio, actualizaciones y notificaciones importantes
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Mejorar nuestros servicios y desarrollar nuevas funcionalidades
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Cumplir con obligaciones legales y regulatorias aplicables
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          3. Base Legal para el Tratamiento
        </Typography>
        <Typography variant="body2" paragraph>
          El tratamiento de sus datos personales se basa en las siguientes bases legales:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            <strong>Consentimiento:</strong> Su consentimiento libre, previo, expreso, informado e inequívoco
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Ejecución de contrato:</strong> Para la prestación de nuestros servicios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Interés legítimo:</strong> Para mejorar nuestros servicios y garantizar la seguridad
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Cumplimiento legal:</strong> Para cumplir con obligaciones legales y regulatorias
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          4. Sus Derechos como Titular de Datos
        </Typography>
        <Typography variant="body2" paragraph>
          De conformidad con la Ley 1581 de 2012, usted tiene los siguientes derechos:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            <strong>Conocer, actualizar y rectificar:</strong> Sus datos personales frente a VeriHome
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Revocar:</strong> La autorización y/o solicitar la supresión de datos
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Acceso libre:</strong> A sus datos personales que hayan sido objeto de tratamiento
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Ser informado:</strong> Sobre el uso que se ha dado a sus datos personales
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>Presentar quejas:</strong> Ante la Superintendencia de Industria y Comercio
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          5. Medidas de Seguridad
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome implementa medidas técnicas, humanas y administrativas para proteger sus datos personales:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Encriptación de datos en tránsito y en reposo
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Acceso restringido a datos personales solo a personal autorizado
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Monitoreo continuo de sistemas y auditorías de seguridad
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Capacitación del personal en protección de datos personales
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Procedimientos de respuesta a incidentes de seguridad
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          6. Transferencias y Transmisiones
        </Typography>
        <Typography variant="body2" paragraph>
          Sus datos personales pueden ser transferidos o transmitidos a:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Proveedores de servicios de pago para procesar transacciones
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Proveedores de servicios de verificación de identidad
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Autoridades competentes cuando sea requerido por ley
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Otros usuarios de la plataforma solo con su consentimiento explícito
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          Todas las transferencias se realizan con las garantías de seguridad apropiadas y en cumplimiento 
          de la normativa aplicable.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          7. Retención de Datos
        </Typography>
        <Typography variant="body2" paragraph>
          Sus datos personales serán conservados durante el tiempo necesario para cumplir con las finalidades 
          para las cuales fueron recopilados, incluyendo obligaciones legales, contractuales y regulatorias.
        </Typography>
        <Typography variant="body2" paragraph>
          Una vez cumplidas las finalidades, los datos serán eliminados de forma segura, salvo cuando deban 
          conservarse por obligaciones legales.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          8. Cookies y Tecnologías Similares
        </Typography>
        <Typography variant="body2" paragraph>
          Utilizamos cookies y tecnologías similares para mejorar su experiencia en nuestra plataforma. 
          Estas tecnologías nos permiten:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Recordar sus preferencias y configuraciones
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Analizar el uso de nuestra plataforma para mejorarla
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Proporcionar funcionalidades personalizadas
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Garantizar la seguridad de su cuenta
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          Puede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad 
          de nuestra plataforma.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          9. Menores de Edad
        </Typography>
        <Typography variant="body2" paragraph>
          Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente 
          información personal de menores de edad. Si usted es menor de edad, no debe proporcionar 
          información personal sin el consentimiento de sus padres o tutores.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          10. Cambios en la Política de Privacidad
        </Typography>
        <Typography variant="body2" paragraph>
          Nos reservamos el derecho de modificar esta política de privacidad en cualquier momento. 
          Los cambios entrarán en vigor inmediatamente después de su publicación en nuestra plataforma.
        </Typography>
        <Typography variant="body2" paragraph>
          Le notificaremos sobre cambios significativos a través de nuestra plataforma o por correo electrónico.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          11. Contacto y Ejercicio de Derechos
        </Typography>
        <Typography variant="body2" paragraph>
          Para ejercer sus derechos como titular de datos personales o realizar consultas sobre esta política, 
          puede contactarnos a través de:
        </Typography>
        <Box sx={{ pl: 2, mb: 2 }}>
          <Typography variant="body2" paragraph>
            <strong>Email:</strong> privacidad@verihome.com
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Teléfono:</strong> +57 1 234 5678
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Dirección:</strong> Calle 123 #45-67, Bogotá, Colombia
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Horario de atención:</strong> Lunes a Viernes de 8:00 AM a 6:00 PM
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          También puede presentar quejas ante la Superintendencia de Industria y Comercio (SIC) 
          a través de su página web: www.sic.gov.co
        </Typography>

        {/* Espacio al final para asegurar que se pueda hacer scroll */}
        <Box sx={{ height: '100px' }} />
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid #e0e0e0',
        bgcolor: '#f8f9fa',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!hasScrolledToBottom && (
            <Alert severity="warning" sx={{ py: 0 }}>
              <Typography variant="body2">
                Debes leer hasta el final para aceptar
              </Typography>
            </Alert>
          )}
          {hasScrolledToBottom && (
            <Alert severity="success" sx={{ py: 0 }}>
              <Typography variant="body2">
                Has leído completamente la política
              </Typography>
            </Alert>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            disabled={!hasScrolledToBottom}
            startIcon={<CheckCircleIcon />}
          >
            Aceptar Política
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyModal; 