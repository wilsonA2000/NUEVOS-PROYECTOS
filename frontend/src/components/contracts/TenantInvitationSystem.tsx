/**
 * Sistema de Invitaciones para Arrendatarios - Tokens Seguros
 * Permite al arrendador invitar arrendatarios via email/SMS con links seguros
 * Incluye seguimiento de estado, reenvío automático y gestión de expiración
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper,
  Grid,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  Menu,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Link as LinkIcon,
  Security as SecurityIcon,
  Visibility as ViewIcon,
  FileCopy as CopyIcon,
  WhatsApp as WhatsAppIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow, addDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  SendTenantInvitationPayload,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';

interface TenantInvitationSystemProps {
  contract: LandlordControlledContractData;
  open: boolean;
  onClose: () => void;
  onInvitationSent: (contract: LandlordControlledContractData) => void;
  onError: (error: string) => void;
}

interface InvitationHistory {
  id: string;
  email: string;
  phone?: string;
  method: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'accepted' | 'expired' | 'failed';
  token: string;
  sent_at: string;
  expires_at: string;
  opened_at?: string;
  accepted_at?: string;
  personal_message?: string;
  attempts: number;
  last_reminder?: string;
}

const INVITATION_METHODS = [
  { value: 'email', label: 'Correo Electrónico', icon: <EmailIcon />, description: 'Envío tradicional y confiable' },
  { value: 'sms', label: 'SMS', icon: <SmsIcon />, description: 'Llegada inmediata al celular' },
  { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon />, description: 'Mensaje por WhatsApp Business' },
];

const INVITATION_TEMPLATES = {
  email: {
    formal: 'Estimado/a {tenant_name}, me complace invitarle a revisar el contrato de arrendamiento para la propiedad ubicada en {property_address}.',
    friendly: 'Hola {tenant_name}! Te invito a revisar el contrato para el apartamento en {property_address}. ¿Te parece si lo revisamos juntos?',
    business: 'Buenos días {tenant_name}, como propietario del inmueble en {property_address}, le extiendo la invitación para proceder con el contrato de arrendamiento.',
  },
  sms: {
    short: 'Hola {tenant_name}! Te invito a revisar el contrato para {property_address}. Link: {invitation_link}',
    detailed: 'Contrato listo para {property_address}. Canon: ${monthly_rent}. Depósito: ${security_deposit}. Revisa: {invitation_link}',
  },
  whatsapp: {
    casual: '¡Hola {tenant_name}! 😊 Ya está listo el contrato para {property_address}. Te dejo el link para que lo revises: {invitation_link}',
    professional: 'Buenos días {tenant_name}. Le comparto el link del contrato de arrendamiento para {property_address}: {invitation_link}',
  },
};

export const TenantInvitationSystem: React.FC<TenantInvitationSystemProps> = ({
  contract,
  open,
  onClose,
  onInvitationSent,
  onError,
}) => {
  // Estados principales
  const [invitationMethod, setInvitationMethod] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [invitationHistory, setInvitationHistory] = useState<InvitationHistory[]>([]);
  const [previewMessage, setPreviewMessage] = useState('');
  
  // Estados de UI
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationHistory | null>(null);

  const INVITATION_STEPS = [
    'Información del Arrendatario',
    'Método de Invitación',
    'Personalizar Mensaje',
    'Revisar y Enviar',
  ];

  useEffect(() => {
    if (open) {
      loadInvitationHistory();
    }
  }, [open, contract.id]);

  useEffect(() => {
    // Auto-completar datos si ya existen
    if (contract.tenant_email) {
      setTenantEmail(contract.tenant_email);
    }
    if (contract.tenant_data?.full_name) {
      setTenantName(contract.tenant_data.full_name);
    }
    if (contract.tenant_data?.phone) {
      setTenantPhone(contract.tenant_data.phone);
    }
  }, [contract]);

  useEffect(() => {
    generatePreviewMessage();
  }, [invitationMethod, messageTemplate, tenantName, personalMessage]);

  const loadInvitationHistory = async () => {
    try {
      // En una implementación real, cargaríamos el historial desde el backend
      const mockHistory: InvitationHistory[] = [
        {
          id: '1',
          email: contract.tenant_email || '',
          method: 'email',
          status: 'pending',
          token: 'inv_' + Date.now(),
          sent_at: new Date().toISOString(),
          expires_at: addDays(new Date(), 7).toISOString(),
          attempts: 1,
        },
      ];
      setInvitationHistory(mockHistory);
    } catch (error) {
      console.error('Error loading invitation history:', error);
    }
  };

  const generatePreviewMessage = () => {
    let template = '';
    
    if (personalMessage.trim()) {
      template = personalMessage;
    } else {
      const templates = INVITATION_TEMPLATES[invitationMethod];
      template = templates?.[messageTemplate as keyof typeof templates] || '';
    }

    // Reemplazar variables del template
    const variables = {
      tenant_name: tenantName || '[Nombre del Arrendatario]',
      property_address: contract.property_address || '[Dirección de la Propiedad]',
      monthly_rent: LandlordContractService.formatCurrency(contract.monthly_rent),
      security_deposit: LandlordContractService.formatCurrency(contract.security_deposit),
      contract_duration: `${contract.contract_duration_months} meses`,
      landlord_name: contract.landlord_data.full_name || '[Nombre del Arrendador]',
      invitation_link: 'https://verihome.com/invitation/[token-seguro]',
    };

    let processedMessage = template;
    Object.entries(variables).forEach(([key, value]) => {
      processedMessage = processedMessage.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    setPreviewMessage(processedMessage);
  };

  const validateInvitationData = (): string[] => {
    const errors: string[] = [];

    if (!tenantName.trim()) {
      errors.push('El nombre del arrendatario es requerido');
    }

    if (invitationMethod === 'email' || invitationMethod === 'whatsapp') {
      if (!tenantEmail.trim()) {
        errors.push('El email del arrendatario es requerido');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
        errors.push('El formato del email no es válido');
      }
    }

    if (invitationMethod === 'sms' || invitationMethod === 'whatsapp') {
      if (!tenantPhone.trim()) {
        errors.push('El teléfono del arrendatario es requerido');
      } else if (!/^\+?[1-9]\d{1,14}$/.test(tenantPhone.replace(/\s/g, ''))) {
        errors.push('El formato del teléfono no es válido');
      }
    }

    if (!previewMessage.trim()) {
      errors.push('El mensaje no puede estar vacío');
    }

    return errors;
  };

  const handleSendInvitation = async () => {
    const validationErrors = validateInvitationData();
    if (validationErrors.length > 0) {
      onError('Errores de validación: ' + validationErrors.join(', '));
      return;
    }

    setLoading(true);

    try {
      const payload: SendTenantInvitationPayload = {
        contract_id: contract.id!,
        tenant_email: tenantEmail,
        tenant_phone: invitationMethod !== 'email' ? tenantPhone : undefined,
        tenant_name: tenantName,
        invitation_method: invitationMethod,
        personal_message: previewMessage,
        expires_in_days: 7,
      };

      const success = await LandlordContractService.sendTenantInvitation(payload);

      if (success) {
        // Agregar al historial local
        const newInvitation: InvitationHistory = {
          id: Date.now().toString(),
          email: tenantEmail,
          phone: invitationMethod !== 'email' ? tenantPhone : undefined,
          method: invitationMethod,
          status: 'sent',
          token: 'inv_' + Date.now(),
          sent_at: new Date().toISOString(),
          expires_at: addDays(new Date(), 7).toISOString(),
          personal_message: previewMessage,
          attempts: 1,
        };

        setInvitationHistory(prev => [newInvitation, ...prev]);

        // Refrescar contrato
        const updatedContract = await LandlordContractService.getLandlordContract(contract.id!);
        onInvitationSent(updatedContract);

        onClose();
      }
    } catch (error: any) {
      onError('Error al enviar invitación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: InvitationHistory) => {
    try {
      setLoading(true);
      
      const payload: SendTenantInvitationPayload = {
        contract_id: contract.id!,
        tenant_email: invitation.email,
        tenant_phone: invitation.phone,
        personal_message: invitation.personal_message,
      };

      await LandlordContractService.resendTenantInvitation(contract.id!);

      // Actualizar historial
      setInvitationHistory(prev => 
        prev.map(inv => 
          inv.id === invitation.id 
            ? { ...inv, attempts: inv.attempts + 1, last_reminder: new Date().toISOString() }
            : inv
        )
      );

    } catch (error: any) {
      onError('Error al reenviar invitación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const link = `https://verihome.com/invitation/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      // Mostrar toast de éxito (implementar si es necesario)
    } catch (error) {
      onError('No se pudo copiar el enlace');
    }
  };

  const getInvitationStatusColor = (status: InvitationHistory['status']) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'sent': return 'info';
      case 'delivered': return 'info';
      case 'opened': return 'primary';
      case 'accepted': return 'success';
      case 'expired': return 'error';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getInvitationStatusText = (status: InvitationHistory['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'opened': return 'Abierto';
      case 'accepted': return 'Aceptado';
      case 'expired': return 'Expirado';
      case 'failed': return 'Fallido';
      default: return 'Desconocido';
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Información del Arrendatario
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  placeholder="Ej: Juan Pérez García"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  required={invitationMethod === 'email' || invitationMethod === 'whatsapp'}
                  placeholder="correo@ejemplo.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  required={invitationMethod === 'sms' || invitationMethod === 'whatsapp'}
                  placeholder="+57 300 123 4567"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SmsIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Método de Invitación
            </Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend">Selecciona cómo enviar la invitación:</FormLabel>
              <RadioGroup
                value={invitationMethod}
                onChange={(e) => setInvitationMethod(e.target.value as any)}
              >
                {INVITATION_METHODS.map((method) => (
                  <FormControlLabel
                    key={method.value}
                    value={method.value}
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" sx={{ py: 1 }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {method.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">{method.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {method.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Personalizar Mensaje
            </Typography>
            
            {!personalMessage.trim() && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Plantillas sugeridas:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {Object.keys(INVITATION_TEMPLATES[invitationMethod]).map((template) => (
                    <Chip
                      key={template}
                      label={template.charAt(0).toUpperCase() + template.slice(1)}
                      variant={messageTemplate === template ? 'filled' : 'outlined'}
                      onClick={() => setMessageTemplate(template)}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Mensaje Personal (Opcional)"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Escribe un mensaje personalizado o usa una de las plantillas..."
              helperText="Puedes usar variables como {tenant_name}, {property_address}, {monthly_rent}"
            />

            {previewMessage && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Vista Previa:
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {previewMessage}
                </Typography>
              </Paper>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirmar Invitación
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: 'primary.50', mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Arrendatario</Typography>
                  <Typography variant="body1">{tenantName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Contacto</Typography>
                  <Typography variant="body1">
                    {invitationMethod === 'email' ? tenantEmail : 
                     invitationMethod === 'sms' ? tenantPhone : 
                     `${tenantEmail} / ${tenantPhone}`}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Método</Typography>
                  <Typography variant="body1">
                    {INVITATION_METHODS.find(m => m.value === invitationMethod)?.label}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Expires</Typography>
                  <Typography variant="body1">7 días</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                📧 El arrendatario recibirá un enlace seguro para acceder al contrato y completar sus datos.
                El enlace expirará en 7 días por seguridad.
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2">
                ⚠️ Una vez enviada la invitación, el contrato pasará al estado "Arrendatario Invitado" 
                y deberás esperar su respuesta antes de poder hacer cambios.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderInvitationHistory = () => (
    <Dialog
      open={showHistory}
      onClose={() => setShowHistory(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <TimeIcon sx={{ mr: 1 }} />
          Historial de Invitaciones
        </Box>
      </DialogTitle>
      <DialogContent>
        {invitationHistory.length > 0 ? (
          <List>
            {invitationHistory.map((invitation, index) => (
              <React.Fragment key={invitation.id}>
                <ListItem>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: getInvitationStatusColor(invitation.status) + '.main' }}>
                      {invitation.method === 'email' ? <EmailIcon /> :
                       invitation.method === 'sms' ? <SmsIcon /> : <WhatsAppIcon />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">{invitation.email}</Typography>
                        <Chip
                          size="small"
                          label={getInvitationStatusText(invitation.status)}
                          color={getInvitationStatusColor(invitation.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Enviado: {format(new Date(invitation.sent_at), 'PPp', { locale: es })}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Expira: {formatDistanceToNow(new Date(invitation.expires_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </Typography>
                        {invitation.attempts > 1 && (
                          <>
                            <br />
                            <Typography variant="caption" color="warning.main">
                              Intentos: {invitation.attempts}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Más opciones">
                      <IconButton
                        onClick={(e) => {
                          setMenuAnchorEl(e.currentTarget);
                          setSelectedInvitation(invitation);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < invitationHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            No hay invitaciones previas para este contrato.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowHistory(false)}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <SecurityIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Invitar Arrendatario
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Tooltip title="Ver historial">
                <IconButton onClick={() => setShowHistory(true)}>
                  <TimeIcon />
                </IconButton>
              </Tooltip>
              <Chip 
                label={`Paso ${currentStep + 1} de ${INVITATION_STEPS.length}`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>
          
          {/* Barra de progreso */}
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(currentStep / (INVITATION_STEPS.length - 1)) * 100} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Stepper horizontal */}
            <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
              {INVITATION_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Contenido del paso */}
            {renderStepContent(currentStep)}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            Cancelar
          </Button>
          
          {currentStep > 0 && (
            <Button 
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={loading}
            >
              Anterior
            </Button>
          )}
          
          {currentStep < INVITATION_STEPS.length - 1 ? (
            <Button 
              variant="contained"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                loading ||
                (currentStep === 0 && (!tenantName || !tenantEmail)) ||
                (currentStep === 1 && !invitationMethod)
              }
            >
              Siguiente
            </Button>
          ) : (
            <LoadingButton
              variant="contained"
              loading={loading}
              onClick={handleSendInvitation}
              startIcon={<SendIcon />}
            >
              Enviar Invitación
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Historial de invitaciones */}
      {renderInvitationHistory()}

      {/* Menú contextual para invitaciones */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedInvitation) {
            copyInvitationLink(selectedInvitation.token);
          }
          setMenuAnchorEl(null);
        }}>
          <ListItemIcon><CopyIcon /></ListItemIcon>
          <ListItemText>Copiar Enlace</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          if (selectedInvitation && selectedInvitation.status !== 'accepted') {
            handleResendInvitation(selectedInvitation);
          }
          setMenuAnchorEl(null);
        }}>
          <ListItemIcon><RefreshIcon /></ListItemIcon>
          <ListItemText>Reenviar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default TenantInvitationSystem;