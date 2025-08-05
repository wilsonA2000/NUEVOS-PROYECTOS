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
  Chip,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose, onAccept }) => {
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
          <CheckCircleIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Términos y Condiciones
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
              <strong>Importante:</strong> Por favor lee completamente estos términos y condiciones antes de aceptarlos.
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Última actualización: 15 de junio de 2025
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          1. Aceptación de los Términos
        </Typography>
        <Typography variant="body2" paragraph>
          Al acceder y utilizar la plataforma VeriHome, usted acepta estar legalmente obligado por estos Términos y Condiciones. 
          Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestros servicios.
        </Typography>
        <Typography variant="body2" paragraph>
          Estos términos constituyen un acuerdo legal entre usted y VeriHome, S.A. de C.V. (en adelante, "VeriHome", "nosotros" o "la plataforma"). 
          Al registrarse, acceder o utilizar nuestros servicios, usted confirma que ha leído, entendido y aceptado estos términos en su totalidad.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          2. Descripción del Servicio
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome es una plataforma inmobiliaria que conecta arrendadores, arrendatarios y prestadores de servicios. 
          Facilitamos la publicación de propiedades, la búsqueda de viviendas y la contratación de servicios relacionados con bienes raíces.
        </Typography>
        <Typography variant="body2" paragraph>
          Nuestros servicios incluyen, pero no se limitan a:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Publicación y búsqueda de propiedades en renta
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Generación de contratos digitales con validez legal
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Sistema de pagos y depósitos en garantía
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Verificación de identidad de usuarios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Sistema de calificaciones y reseñas
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Directorio de prestadores de servicios inmobiliarios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Herramientas de comunicación entre usuarios
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          3. Registro de Cuenta
        </Typography>
        <Typography variant="body2" paragraph>
          Para utilizar ciertos servicios de VeriHome, es necesario crear una cuenta. Usted es responsable de mantener la confidencialidad 
          de su información de cuenta y de todas las actividades que ocurran bajo su cuenta.
        </Typography>
        <Typography variant="body2" paragraph>
          Al registrarse, usted acepta:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Proporcionar información precisa, actualizada y completa
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Mantener y actualizar su información cuando sea necesario
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Ser el único responsable de la actividad que ocurra en su cuenta
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Notificar inmediatamente a VeriHome sobre cualquier uso no autorizado de su cuenta
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          4. Publicación de Propiedades
        </Typography>
        <Typography variant="body2" paragraph>
          Los arrendadores son responsables de proporcionar información precisa y actualizada sobre sus propiedades. 
          VeriHome no garantiza la exactitud de la información publicada por los usuarios.
        </Typography>
        <Typography variant="body2" paragraph>
          Al publicar una propiedad, usted declara y garantiza que:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            Tiene el derecho legal para ofrecer la propiedad en renta
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            La información proporcionada es precisa, completa y actualizada
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Las imágenes corresponden a la propiedad anunciada
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            La propiedad cumple con todas las regulaciones aplicables
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          5. Contratos y Pagos
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome facilita la generación de contratos de arrendamiento digitales. Sin embargo, la responsabilidad legal 
          del cumplimiento de los términos del contrato recae en las partes involucradas.
        </Typography>
        <Typography variant="body2" paragraph>
          Los pagos se procesan a través de proveedores de servicios de pago de terceros. VeriHome no almacena información 
          de tarjetas de crédito y no es responsable de las transacciones realizadas por estos proveedores.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          6. Calificaciones y Reseñas
        </Typography>
        <Typography variant="body2" paragraph>
          Los usuarios pueden calificar y reseñar propiedades, arrendadores, arrendatarios y prestadores de servicios. 
          Las calificaciones deben ser honestas y basadas en experiencias reales.
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome se reserva el derecho de eliminar calificaciones falsas, difamatorias o que violen nuestras políticas.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          7. Limitación de Responsabilidad
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome actúa como intermediario y no es responsable por:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            La exactitud de la información proporcionada por los usuarios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Disputas entre arrendadores y arrendatarios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Daños o pérdidas resultantes del uso de nuestros servicios
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Problemas técnicos o interrupciones del servicio
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          8. Modificaciones a los Términos
        </Typography>
        <Typography variant="body2" paragraph>
          VeriHome se reserva el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor 
          inmediatamente después de su publicación en la plataforma.
        </Typography>
        <Typography variant="body2" paragraph>
          Es su responsabilidad revisar periódicamente estos términos para estar al tanto de cualquier cambio.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          9. Ley Aplicable
        </Typography>
        <Typography variant="body2" paragraph>
          Estos términos se rigen por las leyes de Colombia. Cualquier disputa será resuelta en los tribunales competentes 
          de Bogotá, Colombia.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          10. Contacto
        </Typography>
        <Typography variant="body2" paragraph>
          Si tiene alguna pregunta sobre estos términos y condiciones, puede contactarnos a través de:
        </Typography>
        <Box sx={{ pl: 2 }}>
          <Typography variant="body2" paragraph>
            Email: legal@verihome.com
          </Typography>
          <Typography variant="body2" paragraph>
            Teléfono: +57 1 234 5678
          </Typography>
          <Typography variant="body2" paragraph>
            Dirección: Calle 123 #45-67, Bogotá, Colombia
          </Typography>
        </Box>

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
                Has leído completamente los términos
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
            Aceptar Términos
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TermsModal; 