/**
 * Gestor de Garantías de Contratos
 * Sistema completo para administrar depósitos, codeudores, pólizas y otras garantías
 * Incluye verificación, documentos y seguimiento del estado
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab,
  Badge,
  Snackbar,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Security as SecurityIcon,
  AccountBalance as BankIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Verified as VerifiedIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  LandlordContractGuarantee,
  GuarantorType,
  DocumentType,
  GuaranteeDocument,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';

interface ContractGuaranteesManagerProps {
  contract: LandlordControlledContractData;
  userType: 'landlord' | 'tenant';
  onGuaranteeUpdated?: (guarantee: LandlordContractGuarantee) => void;
  readOnly?: boolean;
}

const GUARANTEE_TYPE_LABELS: Record<GuarantorType, string> = {
  'personal': 'Codeudor Personal',
  'company': 'Codeudor Empresa',
  'insurance': 'Póliza de Seguros',
  'deposit': 'Depósito en Efectivo',
  'mixed': 'Garantía Mixta',
};

const GUARANTEE_TYPE_ICONS: Record<GuarantorType, React.ReactNode> = {
  'personal': <PersonIcon />,
  'company': <BusinessIcon />,
  'insurance': <SecurityIcon />,
  'deposit': <MoneyIcon />,
  'mixed': <AssessmentIcon />,
};

const GUARANTEE_STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'pending': 'warning',
  'approved': 'success',
  'rejected': 'error',
  'expired': 'error',
};

const GUARANTEE_STATUS_LABELS: Record<string, string> = {
  'pending': 'Pendiente',
  'approved': 'Aprobada',
  'rejected': 'Rechazada',
  'expired': 'Vencida',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'id_copy': 'Copia de Identificación',
  'income_certificate': 'Certificado de Ingresos',
  'bank_statement': 'Extracto Bancario',
  'property_deed': 'Escritura de Propiedad',
  'insurance_policy': 'Póliza de Seguro',
  'other': 'Otro Documento',
};

export const ContractGuaranteesManager: React.FC<ContractGuaranteesManagerProps> = ({
  contract,
  userType,
  onGuaranteeUpdated,
  readOnly = false,
}) => {
  // Estado principal
  const [guarantees, setGuarantees] = useState<LandlordContractGuarantee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados de diálogos
  const [createGuaranteeDialog, setCreateGuaranteeDialog] = useState(false);
  const [editGuaranteeDialog, setEditGuaranteeDialog] = useState(false);
  const [viewGuaranteeDialog, setViewGuaranteeDialog] = useState(false);
  const [uploadDocumentDialog, setUploadDocumentDialog] = useState(false);
  const [selectedGuarantee, setSelectedGuarantee] = useState<LandlordContractGuarantee | null>(null);

  // Estados de vista
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadGuarantees();
  }, [contract.id]);

  const loadGuarantees = async () => {
    if (!contract.id) return;

    try {
      setLoading(true);
      const contractGuarantees = await LandlordContractService.getContractGuarantees(contract.id);
      setGuarantees(contractGuarantees);
    } catch (err: any) {
      setError('Error al cargar garantías: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Formulario para crear/editar garantía
  const guaranteeFormik = useFormik<Partial<LandlordContractGuarantee>>({
    initialValues: {
      guarantee_type: 'personal',
      amount: 0,
      description: '',
      guarantor_name: '',
      guarantor_document_type: 'CC',
      guarantor_document_number: '',
      guarantor_phone: '',
      guarantor_email: '',
      guarantor_address: '',
      guarantor_income: 0,
      insurance_company: '',
      policy_number: '',
      policy_amount: 0,
      policy_start_date: '',
      policy_end_date: '',
      status: 'pending',
      verified: false,
    },
    validationSchema: Yup.object({
      guarantee_type: Yup.string().required('Tipo de garantía requerido'),
      amount: Yup.number().min(1, 'Monto debe ser mayor a 0').required('Monto requerido'),
      description: Yup.string().max(500, 'Descripción muy larga'),
      
      // Validaciones condicionales para codeudor
      guarantor_name: Yup.string().when('guarantee_type', {
        is: (type: string) => ['personal', 'company'].includes(type),
        then: (schema) => schema.min(3, 'Nombre muy corto').required('Nombre del garante requerido'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      guarantor_document_number: Yup.string().when('guarantee_type', {
        is: (type: string) => ['personal', 'company'].includes(type),
        then: (schema) => schema.matches(/^[0-9]+$/, 'Solo números').required('Documento requerido'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      guarantor_phone: Yup.string().when('guarantee_type', {
        is: (type: string) => ['personal', 'company'].includes(type),
        then: (schema) => schema.matches(/^[0-9\s\-\+\(\)]+$/, 'Teléfono inválido').required('Teléfono requerido'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      guarantor_income: Yup.number().when('guarantee_type', {
        is: (type: string) => ['personal', 'company'].includes(type),
        then: (schema) => schema.min(1, 'Ingresos deben ser mayor a 0').required('Ingresos requeridos'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      // Validaciones para póliza de seguro
      insurance_company: Yup.string().when('guarantee_type', {
        is: 'insurance',
        then: (schema) => schema.min(3, 'Nombre de aseguradora muy corto').required('Aseguradora requerida'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      policy_number: Yup.string().when('guarantee_type', {
        is: 'insurance',
        then: (schema) => schema.min(5, 'Número de póliza muy corto').required('Número de póliza requerido'),
        otherwise: (schema) => schema.notRequired(),
      }),
      
      policy_amount: Yup.number().when('guarantee_type', {
        is: 'insurance',
        then: (schema) => schema.min(1, 'Valor de póliza debe ser mayor a 0').required('Valor de póliza requerido'),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    onSubmit: async (values) => {
      if (!contract.id) return;

      try {
        setLoading(true);
        if (selectedGuarantee?.id) {
          // Actualizar garantía existente
          const updatedGuarantee = await LandlordContractService.updateGuarantee(
            selectedGuarantee.id,
            values
          );
          setGuarantees(prev =>
            prev.map(g => g.id === updatedGuarantee.id ? updatedGuarantee : g)
          );
          setSuccess('Garantía actualizada exitosamente');
          setEditGuaranteeDialog(false);
          onGuaranteeUpdated?.(updatedGuarantee);
        } else {
          // Crear nueva garantía
          const newGuarantee = await LandlordContractService.createGuarantee(
            contract.id,
            values
          );
          setGuarantees(prev => [...prev, newGuarantee]);
          setSuccess('Garantía creada exitosamente');
          setCreateGuaranteeDialog(false);
          onGuaranteeUpdated?.(newGuarantee);
        }
        guaranteeFormik.resetForm();
        setSelectedGuarantee(null);
      } catch (err: any) {
        setError('Error al guardar garantía: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    },
  });

  const handleVerifyGuarantee = async (guaranteeId: string, notes?: string) => {
    try {
      setLoading(true);
      const verifiedGuarantee = await LandlordContractService.verifyGuarantee(
        guaranteeId,
        notes
      );
      setGuarantees(prev =>
        prev.map(g => g.id === verifiedGuarantee.id ? verifiedGuarantee : g)
      );
      setSuccess('Garantía verificada exitosamente');
      onGuaranteeUpdated?.(verifiedGuarantee);
    } catch (err: any) {
      setError('Error al verificar garantía: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditGuarantee = (guarantee: LandlordContractGuarantee) => {
    setSelectedGuarantee(guarantee);
    guaranteeFormik.setValues(guarantee);
    setEditGuaranteeDialog(true);
  };

  const handleAccordionToggle = (guaranteeId: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [guaranteeId]: !prev[guaranteeId],
    }));
  };

  const calculateTotalGuaranteeAmount = (): number => {
    return guarantees
      .filter(g => g.status === 'approved')
      .reduce((total, g) => total + g.amount, 0);
  };

  const getGuaranteeCompletionPercentage = (guarantee: LandlordContractGuarantee): number => {
    let completed = 0;
    let total = 0;

    // Información básica
    total += 4;
    if (guarantee.guarantee_type) completed++;
    if (guarantee.amount > 0) completed++;
    if (guarantee.description) completed++;
    if (guarantee.status !== 'pending') completed++;

    // Información específica por tipo
    if (['personal', 'company'].includes(guarantee.guarantee_type)) {
      total += 5;
      if (guarantee.guarantor_name) completed++;
      if (guarantee.guarantor_document_number) completed++;
      if (guarantee.guarantor_phone) completed++;
      if (guarantee.guarantor_address) completed++;
      if (guarantee.guarantor_income && guarantee.guarantor_income > 0) completed++;
    }

    if (guarantee.guarantee_type === 'insurance') {
      total += 4;
      if (guarantee.insurance_company) completed++;
      if (guarantee.policy_number) completed++;
      if (guarantee.policy_amount && guarantee.policy_amount > 0) completed++;
      if (guarantee.policy_start_date && guarantee.policy_end_date) completed++;
    }

    // Documentos
    total += 1;
    if (guarantee.documents && guarantee.documents.length > 0) completed++;

    // Verificación
    total += 1;
    if (guarantee.verified) completed++;

    return Math.round((completed / total) * 100);
  };

  const canCreateGuarantees = !readOnly && 
    ['TENANT_REVIEWING', 'LANDLORD_REVIEWING', 'BOTH_REVIEWING'].includes(contract.current_state);

  const canVerifyGuarantees = userType === 'landlord' && !readOnly;

  // Resumen de garantías
  const guaranteesStats = {
    total: guarantees.length,
    pending: guarantees.filter(g => g.status === 'pending').length,
    approved: guarantees.filter(g => g.status === 'approved').length,
    rejected: guarantees.filter(g => g.status === 'rejected').length,
    totalAmount: calculateTotalGuaranteeAmount(),
    verified: guarantees.filter(g => g.verified).length,
  };

  return (
    <Box>
      {/* Header con estadísticas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 1 }} />
              Garantías del Contrato
              {guaranteesStats.pending > 0 && (
                <Badge badgeContent={guaranteesStats.pending} color="warning" sx={{ ml: 2 }}>
                  <Chip label="Pendientes" size="small" />
                </Badge>
              )}
            </Typography>

            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadGuarantees}
                size="small"
              >
                Actualizar
              </Button>

              {canCreateGuarantees && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateGuaranteeDialog(true)}
                >
                  Nueva Garantía
                </Button>
              )}
            </Box>
          </Box>

          {/* Estadísticas rápidas */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">{guaranteesStats.total}</Typography>
                <Typography variant="caption">Total</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning">{guaranteesStats.pending}</Typography>
                <Typography variant="caption">Pendientes</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="success">{guaranteesStats.approved}</Typography>
                <Typography variant="caption">Aprobadas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="info">{guaranteesStats.verified}</Typography>
                <Typography variant="caption">Verificadas</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {LandlordContractService.formatCurrency(guaranteesStats.totalAmount)}
                </Typography>
                <Typography variant="caption">Valor Total Aprobado</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Progreso de garantías requeridas */}
          {contract.guarantor_required && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Progreso de Garantías Requeridas
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((guaranteesStats.approved / 1) * 100, 100)}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {guaranteesStats.approved} de {contract.guarantor_required ? 1 : 0} garantías mínimas aprobadas
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Lista de garantías */}
      {guarantees.length > 0 ? (
        <Box>
          {guarantees.map((guarantee) => (
            <Accordion
              key={guarantee.id}
              expanded={expandedAccordions[guarantee.id] || false}
              onChange={() => handleAccordionToggle(guarantee.id)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  borderLeft: `4px solid`,
                  borderLeftColor: `${GUARANTEE_STATUS_COLORS[guarantee.status]}.main`,
                }}
              >
                <Box display="flex" alignItems="center" sx={{ width: '100%' }}>
                  <Avatar sx={{ 
                    bgcolor: `${GUARANTEE_STATUS_COLORS[guarantee.status]}.main`,
                    mr: 2
                  }}>
                    {GUARANTEE_TYPE_ICONS[guarantee.guarantee_type]}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {GUARANTEE_TYPE_LABELS[guarantee.guarantee_type]}
                      {guarantee.guarantor_name && ` - ${guarantee.guarantor_name}`}
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Chip
                        label={GUARANTEE_STATUS_LABELS[guarantee.status]}
                        color={GUARANTEE_STATUS_COLORS[guarantee.status]}
                        size="small"
                      />
                      <Chip
                        label={LandlordContractService.formatCurrency(guarantee.amount)}
                        variant="outlined"
                        size="small"
                      />
                      {guarantee.verified && (
                        <Chip
                          label="Verificada"
                          color="success"
                          size="small"
                          icon={<VerifiedIcon />}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {getGuaranteeCompletionPercentage(guarantee)}% completo
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={getGuaranteeCompletionPercentage(guarantee)}
                    sx={{ width: 100, mr: 2 }}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Información básica */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                        📋 Información Básica
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Tipo</Typography>
                        <Typography variant="body2">{GUARANTEE_TYPE_LABELS[guarantee.guarantee_type]}</Typography>
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Monto</Typography>
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {LandlordContractService.formatCurrency(guarantee.amount)}
                        </Typography>
                      </Box>
                      {guarantee.description && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Descripción</Typography>
                          <Typography variant="body2">{guarantee.description}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">Fecha de Creación</Typography>
                        <Typography variant="body2">
                          {format(new Date(guarantee.created_at), 'PPP', { locale: es })}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Información específica por tipo */}
                  <Grid item xs={12} md={6}>
                    {(['personal', 'company'].includes(guarantee.guarantee_type)) && (
                      <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                          👤 Información del Garante
                        </Typography>
                        {guarantee.guarantor_name && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Nombre</Typography>
                            <Typography variant="body2">{guarantee.guarantor_name}</Typography>
                          </Box>
                        )}
                        {guarantee.guarantor_document_number && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Documento</Typography>
                            <Typography variant="body2">
                              {guarantee.guarantor_document_type} {guarantee.guarantor_document_number}
                            </Typography>
                          </Box>
                        )}
                        {guarantee.guarantor_phone && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                            <Typography variant="body2">{guarantee.guarantor_phone}</Typography>
                          </Box>
                        )}
                        {guarantee.guarantor_email && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Email</Typography>
                            <Typography variant="body2">{guarantee.guarantor_email}</Typography>
                          </Box>
                        )}
                        {guarantee.guarantor_income && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Ingresos</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {LandlordContractService.formatCurrency(guarantee.guarantor_income)}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {guarantee.guarantee_type === 'insurance' && (
                      <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                          🛡️ Información de la Póliza
                        </Typography>
                        {guarantee.insurance_company && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Aseguradora</Typography>
                            <Typography variant="body2">{guarantee.insurance_company}</Typography>
                          </Box>
                        )}
                        {guarantee.policy_number && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Número de Póliza</Typography>
                            <Typography variant="body2">{guarantee.policy_number}</Typography>
                          </Box>
                        )}
                        {guarantee.policy_amount && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Valor de Cobertura</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {LandlordContractService.formatCurrency(guarantee.policy_amount)}
                            </Typography>
                          </Box>
                        )}
                        {guarantee.policy_start_date && guarantee.policy_end_date && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Vigencia</Typography>
                            <Typography variant="body2">
                              {format(new Date(guarantee.policy_start_date), 'PP', { locale: es })} - {' '}
                              {format(new Date(guarantee.policy_end_date), 'PP', { locale: es })}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {guarantee.guarantee_type === 'deposit' && (
                      <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                          💰 Depósito en Efectivo
                        </Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Este depósito debe ser consignado en una cuenta especial para garantías.
                        </Alert>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Monto del Depósito</Typography>
                          <Typography variant="h6" color="primary">
                            {LandlordContractService.formatCurrency(guarantee.amount)}
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                  </Grid>

                  {/* Documentos */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="medium">
                          📄 Documentos Adjuntos
                        </Typography>
                        {!readOnly && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<UploadIcon />}
                            onClick={() => {
                              setSelectedGuarantee(guarantee);
                              setUploadDocumentDialog(true);
                            }}
                          >
                            Subir Documento
                          </Button>
                        )}
                      </Box>

                      {guarantee.documents && guarantee.documents.length > 0 ? (
                        <List dense>
                          {guarantee.documents.map((doc, index) => (
                            <ListItem key={index} divider>
                              <ListItemIcon>
                                <DocumentIcon color={doc.verified ? 'success' : 'default'} />
                              </ListItemIcon>
                              <ListItemText
                                primary={doc.file_name}
                                secondary={
                                  <>
                                    <Typography variant="caption" color="text.secondary">
                                      {DOCUMENT_TYPE_LABELS[doc.document_type]} - {' '}
                                      {format(new Date(doc.uploaded_at), 'PPP', { locale: es })}
                                    </Typography>
                                    {doc.description && (
                                      <Typography variant="caption" sx={{ display: 'block' }}>
                                        {doc.description}
                                      </Typography>
                                    )}
                                  </>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Box display="flex" gap={1}>
                                  <IconButton size="small" onClick={() => window.open(doc.file_url, '_blank')}>
                                    <DownloadIcon />
                                  </IconButton>
                                  {doc.verified && (
                                    <Chip label="Verificado" color="success" size="small" />
                                  )}
                                </Box>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Alert severity="info">
                          No hay documentos adjuntos. Los documentos son necesarios para verificar la garantía.
                        </Alert>
                      )}
                    </Paper>
                  </Grid>

                  {/* Acciones */}
                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => {
                          setSelectedGuarantee(guarantee);
                          setViewGuaranteeDialog(true);
                        }}
                      >
                        Ver Detalles
                      </Button>

                      {!readOnly && (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditGuarantee(guarantee)}
                        >
                          Editar
                        </Button>
                      )}

                      {canVerifyGuarantees && !guarantee.verified && guarantee.status === 'approved' && (
                        <LoadingButton
                          variant="contained"
                          color="success"
                          startIcon={<VerifiedIcon />}
                          onClick={() => handleVerifyGuarantee(guarantee.id)}
                          loading={loading}
                        >
                          Verificar
                        </LoadingButton>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Box textAlign="center" py={6}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                <SecurityIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No hay garantías configuradas
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Las garantías proporcionan seguridad adicional para el contrato de arrendamiento
              </Typography>
              
              {canCreateGuarantees && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateGuaranteeDialog(true)}
                >
                  Crear Primera Garantía
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* FAB para crear garantía */}
      {canCreateGuarantees && guarantees.length > 0 && (
        <Fab
          color="primary"
          aria-label="Nueva garantía"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setCreateGuaranteeDialog(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog para crear/editar garantía */}
      <Dialog
        open={createGuaranteeDialog || editGuaranteeDialog}
        onClose={() => {
          setCreateGuaranteeDialog(false);
          setEditGuaranteeDialog(false);
          setSelectedGuarantee(null);
          guaranteeFormik.resetForm();
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <SecurityIcon sx={{ mr: 1 }} />
            {selectedGuarantee ? 'Editar Garantía' : 'Nueva Garantía'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={guaranteeFormik.handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Información básica */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                  📋 Información Básica
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Garantía</InputLabel>
                  <Select
                    name="guarantee_type"
                    value={guaranteeFormik.values.guarantee_type}
                    onChange={guaranteeFormik.handleChange}
                    error={guaranteeFormik.touched.guarantee_type && Boolean(guaranteeFormik.errors.guarantee_type)}
                  >
                    <MenuItem value="personal">👤 Codeudor Personal</MenuItem>
                    <MenuItem value="company">🏢 Codeudor Empresa</MenuItem>
                    <MenuItem value="insurance">🛡️ Póliza de Seguros</MenuItem>
                    <MenuItem value="deposit">💰 Depósito en Efectivo</MenuItem>
                    <MenuItem value="mixed">📊 Garantía Mixta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Monto de la Garantía"
                  name="amount"
                  type="number"
                  value={guaranteeFormik.values.amount}
                  onChange={guaranteeFormik.handleChange}
                  error={guaranteeFormik.touched.amount && Boolean(guaranteeFormik.errors.amount)}
                  helperText={
                    guaranteeFormik.touched.amount && guaranteeFormik.errors.amount
                      ? guaranteeFormik.errors.amount
                      : `Equivale a ${LandlordContractService.formatCurrency(guaranteeFormik.values.amount || 0)}`
                  }
                  InputProps={{
                    startAdornment: '$',
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descripción (Opcional)"
                  name="description"
                  value={guaranteeFormik.values.description}
                  onChange={guaranteeFormik.handleChange}
                  error={guaranteeFormik.touched.description && Boolean(guaranteeFormik.errors.description)}
                  helperText={guaranteeFormik.touched.description && guaranteeFormik.errors.description}
                  placeholder="Detalles adicionales sobre esta garantía..."
                />
              </Grid>

              {/* Información del garante (para tipos personal y company) */}
              {['personal', 'company'].includes(guaranteeFormik.values.guarantee_type || '') && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                      👤 Información del Garante
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Nombre Completo del Garante"
                      name="guarantor_name"
                      value={guaranteeFormik.values.guarantor_name}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.guarantor_name && Boolean(guaranteeFormik.errors.guarantor_name)}
                      helperText={guaranteeFormik.touched.guarantor_name && guaranteeFormik.errors.guarantor_name}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Documento</InputLabel>
                      <Select
                        name="guarantor_document_type"
                        value={guaranteeFormik.values.guarantor_document_type}
                        onChange={guaranteeFormik.handleChange}
                      >
                        <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                        <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                        <MenuItem value="NIT">NIT</MenuItem>
                        <MenuItem value="PP">Pasaporte</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Número de Documento"
                      name="guarantor_document_number"
                      value={guaranteeFormik.values.guarantor_document_number}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.guarantor_document_number && Boolean(guaranteeFormik.errors.guarantor_document_number)}
                      helperText={guaranteeFormik.touched.guarantor_document_number && guaranteeFormik.errors.guarantor_document_number}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      name="guarantor_phone"
                      value={guaranteeFormik.values.guarantor_phone}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.guarantor_phone && Boolean(guaranteeFormik.errors.guarantor_phone)}
                      helperText={guaranteeFormik.touched.guarantor_phone && guaranteeFormik.errors.guarantor_phone}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email (Opcional)"
                      name="guarantor_email"
                      type="email"
                      value={guaranteeFormik.values.guarantor_email}
                      onChange={guaranteeFormik.handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ingresos Mensuales"
                      name="guarantor_income"
                      type="number"
                      value={guaranteeFormik.values.guarantor_income}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.guarantor_income && Boolean(guaranteeFormik.errors.guarantor_income)}
                      helperText={guaranteeFormik.touched.guarantor_income && guaranteeFormik.errors.guarantor_income}
                      InputProps={{
                        startAdornment: '$',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Dirección"
                      name="guarantor_address"
                      value={guaranteeFormik.values.guarantor_address}
                      onChange={guaranteeFormik.handleChange}
                    />
                  </Grid>
                </>
              )}

              {/* Información de la póliza (para tipo insurance) */}
              {guaranteeFormik.values.guarantee_type === 'insurance' && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                      🛡️ Información de la Póliza
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Compañía Aseguradora"
                      name="insurance_company"
                      value={guaranteeFormik.values.insurance_company}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.insurance_company && Boolean(guaranteeFormik.errors.insurance_company)}
                      helperText={guaranteeFormik.touched.insurance_company && guaranteeFormik.errors.insurance_company}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Número de Póliza"
                      name="policy_number"
                      value={guaranteeFormik.values.policy_number}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.policy_number && Boolean(guaranteeFormik.errors.policy_number)}
                      helperText={guaranteeFormik.touched.policy_number && guaranteeFormik.errors.policy_number}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Valor de Cobertura"
                      name="policy_amount"
                      type="number"
                      value={guaranteeFormik.values.policy_amount}
                      onChange={guaranteeFormik.handleChange}
                      error={guaranteeFormik.touched.policy_amount && Boolean(guaranteeFormik.errors.policy_amount)}
                      helperText={guaranteeFormik.touched.policy_amount && guaranteeFormik.errors.policy_amount}
                      InputProps={{
                        startAdornment: '$',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Fecha de Inicio"
                      name="policy_start_date"
                      type="date"
                      value={guaranteeFormik.values.policy_start_date}
                      onChange={guaranteeFormik.handleChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Fecha de Vencimiento"
                      name="policy_end_date"
                      type="date"
                      value={guaranteeFormik.values.policy_end_date}
                      onChange={guaranteeFormik.handleChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateGuaranteeDialog(false);
            setEditGuaranteeDialog(false);
            setSelectedGuarantee(null);
            guaranteeFormik.resetForm();
          }}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={guaranteeFormik.handleSubmit}
            loading={loading}
            variant="contained"
            startIcon={selectedGuarantee ? <EditIcon /> : <AddIcon />}
          >
            {selectedGuarantee ? 'Actualizar' : 'Crear'} Garantía
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractGuaranteesManager;