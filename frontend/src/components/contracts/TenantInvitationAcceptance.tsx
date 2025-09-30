/**
 * Sistema de Aceptación de Invitaciones para Arrendatarios
 * Permite al arrendatario ver, revisar y aceptar invitaciones de contratos
 * Incluye validación de tokens, vista previa del contrato y formulario de datos
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  Grid,
  Avatar,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  AcceptInvitationPayload,
  CompleteTenantDataPayload,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';

interface TenantInvitationAcceptanceProps {
  invitationToken: string;
  onAcceptComplete: (contract: LandlordControlledContractData) => void;
  onError: (error: string) => void;
}

interface InvitationInfo {
  contract_id: string;
  property_address: string;
  monthly_rent: number;
  landlord_name: string;
  contract_duration_months: number;
  invitation_expires_at: string;
  is_valid: boolean;
  property_details?: {
    type: string;
    area: number;
    rooms: number;
    bathrooms: number;
    amenities: string[];
  };
}

interface TenantData {
  full_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  current_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  employment_status: string;
  employer_name: string;
  monthly_income: number;
  work_experience_years: number;
  references: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
}

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Empleado' },
  { value: 'self_employed', label: 'Independiente' },
  { value: 'unemployed', label: 'Desempleado' },
  { value: 'student', label: 'Estudiante' },
  { value: 'retired', label: 'Pensionado' },
];

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'PP', label: 'Pasaporte' },
];

const ACCEPTANCE_STEPS = [
  'Verificar Invitación',
  'Revisar Contrato',
  'Completar Datos Personales',
  'Confirmar Aceptación',
];

export const TenantInvitationAcceptance: React.FC<TenantInvitationAcceptanceProps> = ({
  invitationToken,
  onAcceptComplete,
  onError,
}) => {
  // Estados principales
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [contract, setContract] = useState<LandlordControlledContractData | null>(null);
  const [tenantData, setTenantData] = useState<TenantData>({
    full_name: '',
    document_type: 'CC',
    document_number: '',
    email: '',
    phone: '',
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    employment_status: 'employed',
    employer_name: '',
    monthly_income: 0,
    work_experience_years: 0,
    references: [
      { name: '', phone: '', relationship: 'Familiar' },
      { name: '', phone: '', relationship: 'Laboral' },
    ],
  });

  // Estados de UI
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    verifyInvitation();
  }, [invitationToken]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);

      // Verificar token de invitación
      const tokenVerification = await LandlordContractService.verifyInvitationToken(invitationToken);
      
      if (!tokenVerification.is_valid) {
        onError('La invitación no es válida o ha expirado');
        return;
      }

      // Obtener información de la invitación
      const invitationData = await LandlordContractService.getContractInvitationInfo(invitationToken);
      setInvitationInfo(invitationData);

      // Cargar contrato completo
      const contractData = await LandlordContractService.getTenantContract(invitationData.contract_id);
      setContract(contractData);

      setCurrentStep(1);

    } catch (error: any) {
      onError('Error al verificar invitación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const validateTenantData = (): string[] => {
    const errors: string[] = [];

    if (!tenantData.full_name.trim()) {
      errors.push('El nombre completo es requerido');
    }

    if (!tenantData.document_number.trim()) {
      errors.push('El número de documento es requerido');
    }

    if (!tenantData.email.trim()) {
      errors.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantData.email)) {
      errors.push('El formato del email no es válido');
    }

    if (!tenantData.phone.trim()) {
      errors.push('El teléfono es requerido');
    }

    if (!tenantData.current_address.trim()) {
      errors.push('La dirección actual es requerida');
    }

    if (!tenantData.emergency_contact_name.trim()) {
      errors.push('El contacto de emergencia es requerido');
    }

    if (!tenantData.emergency_contact_phone.trim()) {
      errors.push('El teléfono de emergencia es requerido');
    }

    if (tenantData.employment_status === 'employed' && !tenantData.employer_name.trim()) {
      errors.push('El nombre del empleador es requerido');
    }

    if (tenantData.monthly_income <= 0) {
      errors.push('Los ingresos mensuales deben ser mayores a cero');
    }

    // Validar que al menos tenga una referencia completa
    const validReferences = tenantData.references.filter(
      ref => ref.name.trim() && ref.phone.trim()
    );
    if (validReferences.length === 0) {
      errors.push('Debe proporcionar al menos una referencia personal');
    }

    return errors;
  };

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);

      // Aceptar invitación
      const payload: AcceptInvitationPayload = {
        invitation_token: invitationToken,
      };

      const acceptedContract = await LandlordContractService.acceptTenantInvitation(payload);
      setContract(acceptedContract);
      setCurrentStep(2);

    } catch (error: any) {
      onError('Error al aceptar invitación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTenantData = async () => {
    const errors = validateTenantData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      setLoading(true);

      const payload: CompleteTenantDataPayload = {
        contract_id: contract!.id!,
        tenant_data: tenantData,
      };

      const updatedContract = await LandlordContractService.completeTenantData(payload);
      onAcceptComplete(updatedContract);

    } catch (error: any) {
      onError('Error al completar datos: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box textAlign="center" py={4}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <SecurityIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Verificando Invitación
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Validando el token de invitación y cargando información del contrato...
            </Typography>
            <LinearProgress />
          </Box>
        );

      case 1:
        return invitationInfo ? (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Información del Contrato
            </Typography>
            
            {/* Información básica */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Propiedad</Typography>
                  <Typography variant="h6">{invitationInfo.property_address}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Arrendador</Typography>
                  <Typography variant="h6">{invitationInfo.landlord_name}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Canon Mensual</Typography>
                  <Typography variant="h6" color="primary">
                    {LandlordContractService.formatCurrency(invitationInfo.monthly_rent)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Duración</Typography>
                  <Typography variant="h6">{invitationInfo.contract_duration_months} meses</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Invitación expira</Typography>
                  <Typography variant="body1" color="warning.main">
                    {formatDistanceToNow(new Date(invitationInfo.invitation_expires_at), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Detalles de la propiedad */}
            {invitationInfo.property_details && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <HomeIcon sx={{ mr: 1 }} />
                  Detalles de la Propiedad
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Tipo</Typography>
                    <Typography variant="body1">{invitationInfo.property_details.type}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Área</Typography>
                    <Typography variant="body1">{invitationInfo.property_details.area} m²</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Habitaciones</Typography>
                    <Typography variant="body1">{invitationInfo.property_details.rooms}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Baños</Typography>
                    <Typography variant="body1">{invitationInfo.property_details.bathrooms}</Typography>
                  </Grid>
                </Grid>
                {invitationInfo.property_details.amenities.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Amenidades</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      {invitationInfo.property_details.amenities.map((amenity, index) => (
                        <Chip key={index} label={amenity} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            {/* Alertas */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                📄 Al aceptar esta invitación, podrás revisar el contrato completo y agregar tus datos personales.
                Tendrás la oportunidad de presentar objeciones si algo no te parece correcto.
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2">
                ⏰ Esta invitación expirará el {format(new Date(invitationInfo.invitation_expires_at), 'PPP', { locale: es })}.
                No podrás acceder después de esa fecha.
              </Typography>
            </Alert>

            <Box display="flex" gap={2} justifyContent="center" sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={() => setShowContractPreview(true)}
              >
                Ver Vista Previa
              </Button>
              <LoadingButton
                variant="contained"
                loading={loading}
                onClick={handleAcceptInvitation}
                startIcon={<CheckIcon />}
              >
                Aceptar Invitación
              </LoadingButton>
            </Box>
          </Box>
        ) : (
          <Skeleton height={300} />
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Completar Datos Personales
            </Typography>
            
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Errores encontrados:</Typography>
                <List dense>
                  {validationErrors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}

            {/* Información Personal */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Información Personal
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    value={tenantData.full_name}
                    onChange={(e) => setTenantData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo de Documento</InputLabel>
                    <Select
                      value={tenantData.document_type}
                      onChange={(e) => setTenantData(prev => ({ ...prev, document_type: e.target.value }))}
                      label="Tipo de Documento"
                    >
                      {DOCUMENT_TYPES.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Documento"
                    value={tenantData.document_number}
                    onChange={(e) => setTenantData(prev => ({ ...prev, document_number: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={tenantData.email}
                    onChange={(e) => setTenantData(prev => ({ ...prev, email: e.target.value }))}
                    required
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
                    value={tenantData.phone}
                    onChange={(e) => setTenantData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección Actual"
                    value={tenantData.current_address}
                    onChange={(e) => setTenantData(prev => ({ ...prev, current_address: e.target.value }))}
                    required
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Contacto de Emergencia */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Contacto de Emergencia
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Contacto"
                    value={tenantData.emergency_contact_name}
                    onChange={(e) => setTenantData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono del Contacto"
                    value={tenantData.emergency_contact_phone}
                    onChange={(e) => setTenantData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    required
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Información Laboral */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ mr: 1 }} />
                Información Laboral
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Estado Laboral</InputLabel>
                    <Select
                      value={tenantData.employment_status}
                      onChange={(e) => setTenantData(prev => ({ ...prev, employment_status: e.target.value }))}
                      label="Estado Laboral"
                    >
                      {EMPLOYMENT_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {tenantData.employment_status === 'employed' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre del Empleador"
                      value={tenantData.employer_name}
                      onChange={(e) => setTenantData(prev => ({ ...prev, employer_name: e.target.value }))}
                      required
                    />
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ingresos Mensuales"
                    type="number"
                    value={tenantData.monthly_income}
                    onChange={(e) => setTenantData(prev => ({ ...prev, monthly_income: Number(e.target.value) }))}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BankIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Años de Experiencia Laboral"
                    type="number"
                    value={tenantData.work_experience_years}
                    onChange={(e) => setTenantData(prev => ({ ...prev, work_experience_years: Number(e.target.value) }))}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Referencias */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Referencias Personales
              </Typography>
              {tenantData.references.map((reference, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Referencia {index + 1} ({reference.relationship})
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Nombre"
                        value={reference.name}
                        onChange={(e) => {
                          const newReferences = [...tenantData.references];
                          newReferences[index].name = e.target.value;
                          setTenantData(prev => ({ ...prev, references: newReferences }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        value={reference.phone}
                        onChange={(e) => {
                          const newReferences = [...tenantData.references];
                          newReferences[index].phone = e.target.value;
                          setTenantData(prev => ({ ...prev, references: newReferences }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Relación</InputLabel>
                        <Select
                          value={reference.relationship}
                          onChange={(e) => {
                            const newReferences = [...tenantData.references];
                            newReferences[index].relationship = e.target.value;
                            setTenantData(prev => ({ ...prev, references: newReferences }));
                          }}
                          label="Relación"
                        >
                          <MenuItem value="Familiar">Familiar</MenuItem>
                          <MenuItem value="Laboral">Laboral</MenuItem>
                          <MenuItem value="Personal">Personal</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Paper>

            <Box textAlign="center">
              <LoadingButton
                variant="contained"
                size="large"
                loading={loading}
                onClick={handleCompleteTenantData}
                startIcon={<CheckIcon />}
              >
                Completar y Continuar
              </LoadingButton>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box maxWidth="lg" mx="auto" p={2}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box textAlign="center" sx={{ mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <DocumentIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Invitación de Contrato
            </Typography>
            <Typography color="text.secondary">
              Has sido invitado a participar en un contrato de arrendamiento
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
            {ACCEPTANCE_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Contenido del paso */}
          {renderStepContent(currentStep)}
        </CardContent>
      </Card>

      {/* Dialog de vista previa del contrato */}
      <Dialog
        open={showContractPreview}
        onClose={() => setShowContractPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vista Previa del Contrato
        </DialogTitle>
        <DialogContent>
          {contract ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Contrato de Arrendamiento
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Esta es una vista previa. El contrato completo estará disponible después de completar tus datos.
              </Typography>
              
              {/* Información básica del contrato */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Propiedad</Typography>
                    <Typography variant="body1">{contract.property_address}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Canon Mensual</Typography>
                    <Typography variant="body1" color="primary">
                      {LandlordContractService.formatCurrency(contract.monthly_rent)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Depósito</Typography>
                    <Typography variant="body1">
                      {LandlordContractService.formatCurrency(contract.security_deposit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Duración</Typography>
                    <Typography variant="body1">{contract.contract_duration_months} meses</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          ) : (
            <Skeleton height={200} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowContractPreview(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantInvitationAcceptance;