/**
 * Gestor de Objeciones de Contratos
 * Sistema completo para presentar, revisar y resolver objeciones en contratos
 * Incluye interfaz intuitiva, categorización y seguimiento del estado
 */

import React, { useState, useEffect } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab,
  Badge,
  Paper,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Check as AcceptIcon,
  Close as RejectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Flag as PriorityIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
  Gavel as LegalIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  ContractObjection,
  ObjectionPriority,
  ObjectionStatus,
  SubmitObjectionPayload,
  RespondObjectionPayload,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';
import CustomNotification from '../common/CustomNotification';

interface ContractObjectionsManagerProps {
  contract: LandlordControlledContractData;
  userType: 'landlord' | 'tenant';
  onObjectionUpdated?: (objection: ContractObjection) => void;
  onContractUpdated?: (contract: LandlordControlledContractData) => void;
  readOnly?: boolean;
}

const PRIORITY_COLORS: Record<ObjectionPriority, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'LOW': 'info',
  'MEDIUM': 'warning',
  'HIGH': 'error',
  'CRITICAL': 'error',
};

const PRIORITY_LABELS: Record<ObjectionPriority, string> = {
  'LOW': 'Baja',
  'MEDIUM': 'Media',
  'HIGH': 'Alta',
  'CRITICAL': 'Crítica',
};

const STATUS_COLORS: Record<ObjectionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'PENDING': 'warning',
  'ACCEPTED': 'success',
  'REJECTED': 'error',
  'WITHDRAWN': 'default',
};

const STATUS_LABELS: Record<ObjectionStatus, string> = {
  'PENDING': 'Pendiente',
  'ACCEPTED': 'Aceptada',
  'REJECTED': 'Rechazada',
  'WITHDRAWN': 'Retirada',
};

// Lista de campos común para objetar
const OBJECTIONABLE_FIELDS = [
  { value: 'monthly_rent', label: 'Canon Mensual', category: 'economic' },
  { value: 'security_deposit', label: 'Depósito de Garantía', category: 'economic' },
  { value: 'contract_duration_months', label: 'Duración del Contrato', category: 'terms' },
  { value: 'payment_day', label: 'Día de Pago', category: 'terms' },
  { value: 'late_payment_fee_percentage', label: 'Recargo por Mora', category: 'economic' },
  { value: 'utilities_included', label: 'Servicios Incluidos', category: 'services' },
  { value: 'pets_allowed', label: 'Mascotas Permitidas', category: 'policies' },
  { value: 'smoking_allowed', label: 'Fumar Permitido', category: 'policies' },
  { value: 'max_occupants', label: 'Máximo de Ocupantes', category: 'policies' },
  { value: 'guests_policy', label: 'Política de Huéspedes', category: 'policies' },
  { value: 'maintenance_responsibility', label: 'Responsabilidad de Mantenimiento', category: 'responsibilities' },
  { value: 'rent_increase_type', label: 'Tipo de Incremento', category: 'terms' },
  { value: 'guarantor_required', label: 'Codeudor Requerido', category: 'guarantees' },
  { value: 'special_clauses', label: 'Cláusulas Especiales', category: 'legal' },
];

const FIELD_CATEGORIES = {
  'economic': { label: '💰 Términos Económicos', color: 'primary' },
  'terms': { label: '📋 Términos Contractuales', color: 'secondary' },
  'services': { label: '🏠 Servicios', color: 'info' },
  'policies': { label: '📜 Políticas', color: 'warning' },
  'responsibilities': { label: '🔧 Responsabilidades', color: 'error' },
  'guarantees': { label: '🛡️ Garantías', color: 'success' },
  'legal': { label: '⚖️ Legales', color: 'default' },
};

export const ContractObjectionsManager: React.FC<ContractObjectionsManagerProps> = ({
  contract,
  userType,
  onObjectionUpdated,
  onContractUpdated,
  readOnly = false,
}) => {
  // Estado principal
  const [objections, setObjections] = useState<ContractObjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados de diálogos
  const [createObjectionDialog, setCreateObjectionDialog] = useState(false);
  const [viewObjectionDialog, setViewObjectionDialog] = useState(false);
  const [respondObjectionDialog, setRespondObjectionDialog] = useState(false);
  const [selectedObjection, setSelectedObjection] = useState<ContractObjection | null>(null);

  // Estados de filtros y vista
  const [filterStatus, setFilterStatus] = useState<ObjectionStatus | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showResolved, setShowResolved] = useState(true);

  useEffect(() => {
    loadObjections();
  }, [contract.id]);

  const loadObjections = async () => {
    if (!contract.id) return;
    
    try {
      setLoading(true);
      const contractObjections = await LandlordContractService.getContractObjections(contract.id);
      setObjections(contractObjections);
    } catch (err: any) {
      setError(`Error al cargar objeciones: ${  err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Formulario para crear objeción
  const createObjectionFormik = useFormik<SubmitObjectionPayload>({
    initialValues: {
      contract_id: contract.id || '',
      field_name: '',
      current_value: '',
      proposed_value: '',
      justification: '',
      priority: 'MEDIUM',
    },
    validationSchema: Yup.object({
      field_name: Yup.string().required('Campo a objetar es requerido'),
      current_value: Yup.string().required('Valor actual es requerido'),
      proposed_value: Yup.string().required('Valor propuesto es requerido'),
      justification: Yup.string()
        .min(20, 'Justificación debe tener al menos 20 caracteres')
        .required('Justificación es requerida'),
      priority: Yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).required(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        const newObjection = await LandlordContractService.submitObjection(values);
        setObjections(prev => [...prev, newObjection]);
        setSuccess('Objeción presentada exitosamente');
        setCreateObjectionDialog(false);
        resetForm();
        onObjectionUpdated?.(newObjection);
      } catch (err: any) {
        setError(`Error al presentar objeción: ${  err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    },
  });

  // Formulario para responder objeción
  const respondObjectionFormik = useFormik<{
    response: 'ACCEPTED' | 'REJECTED';
    response_note: string;
  }>({
    initialValues: {
      response: 'ACCEPTED',
      response_note: '',
    },
    validationSchema: Yup.object({
      response_note: Yup.string()
        .min(10, 'Respuesta debe tener al menos 10 caracteres')
        .required('Respuesta es requerida'),
    }),
    onSubmit: async (values) => {
      if (!selectedObjection) return;

      try {
        setLoading(true);
        const updatedObjection = await LandlordContractService.respondToObjection({
          objection_id: selectedObjection.id,
          ...values,
        });
        
        setObjections(prev => 
          prev.map(obj => obj.id === updatedObjection.id ? updatedObjection : obj),
        );
        setSuccess(`Objeción ${values.response.toLowerCase()} exitosamente`);
        setRespondObjectionDialog(false);
        setSelectedObjection(null);
        onObjectionUpdated?.(updatedObjection);
      } catch (err: any) {
        setError(`Error al responder objeción: ${  err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleWithdrawObjection = async (objectionId: string) => {
    try {
      setLoading(true);
      const updatedObjection = await LandlordContractService.withdrawObjection(objectionId);
      setObjections(prev => 
        prev.map(obj => obj.id === updatedObjection.id ? updatedObjection : obj),
      );
      setSuccess('Objeción retirada exitosamente');
      onObjectionUpdated?.(updatedObjection);
    } catch (err: any) {
      setError(`Error al retirar objeción: ${  err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Obtener el valor actual del campo en el contrato
  const getCurrentFieldValue = (fieldName: string): string => {
    const value = (contract as any)[fieldName];
    if (value === null || value === undefined) return 'No especificado';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      if (fieldName.includes('rent') || fieldName.includes('deposit') || fieldName.includes('fee')) {
        return LandlordContractService.formatCurrency(value);
      }
      return value.toString();
    }
    return value.toString();
  };

  // Filtrar objeciones
  const filteredObjections = objections.filter(obj => {
    if (filterStatus !== 'ALL' && obj.status !== filterStatus) return false;
    if (!showResolved && (obj.status === 'ACCEPTED' || obj.status === 'REJECTED' || obj.status === 'WITHDRAWN')) return false;
    
    if (filterCategory !== 'ALL') {
      const field = OBJECTIONABLE_FIELDS.find(f => f.value === obj.field_name);
      if (!field || field.category !== filterCategory) return false;
    }
    
    return true;
  });

  // Estadísticas de objeciones
  const objectionsStats = {
    total: objections.length,
    pending: objections.filter(obj => obj.status === 'PENDING').length,
    accepted: objections.filter(obj => obj.status === 'ACCEPTED').length,
    rejected: objections.filter(obj => obj.status === 'REJECTED').length,
    withdrawn: objections.filter(obj => obj.status === 'WITHDRAWN').length,
    critical: objections.filter(obj => obj.priority === 'CRITICAL').length,
    high: objections.filter(obj => obj.priority === 'HIGH').length,
  };

  const canCreateObjections = userType === 'tenant' && !readOnly && 
    ['TENANT_REVIEWING', 'LANDLORD_REVIEWING', 'BOTH_REVIEWING'].includes(contract.current_state);

  const canRespondObjections = userType === 'landlord' && !readOnly &&
    ['OBJECTIONS_PENDING', 'LANDLORD_REVIEWING'].includes(contract.current_state);

  return (
    <Box>
      {/* Header con estadísticas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <CommentIcon sx={{ mr: 1 }} />
              Objeciones del Contrato
              {objectionsStats.pending > 0 && (
                <Badge badgeContent={objectionsStats.pending} color="error" sx={{ ml: 2 }}>
                  <Chip label="Pendientes" size="small" />
                </Badge>
              )}
            </Typography>
            
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadObjections}
                size="small"
              >
                Actualizar
              </Button>
              
              {canCreateObjections && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateObjectionDialog(true)}
                >
                  Nueva Objeción
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Estadísticas rápidas */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">{objectionsStats.total}</Typography>
                <Typography variant="caption">Total</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning">{objectionsStats.pending}</Typography>
                <Typography variant="caption">Pendientes</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="success">{objectionsStats.accepted}</Typography>
                <Typography variant="caption">Aceptadas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="error">{objectionsStats.rejected}</Typography>
                <Typography variant="caption">Rechazadas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="error">{objectionsStats.critical}</Typography>
                <Typography variant="caption">Críticas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning">{objectionsStats.high}</Typography>
                <Typography variant="caption">Altas</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <MenuItem value="ALL">Todos los Estados</MenuItem>
                  <MenuItem value="PENDING">Pendientes</MenuItem>
                  <MenuItem value="ACCEPTED">Aceptadas</MenuItem>
                  <MenuItem value="REJECTED">Rechazadas</MenuItem>
                  <MenuItem value="WITHDRAWN">Retiradas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="ALL">Todas las Categorías</MenuItem>
                  {Object.entries(FIELD_CATEGORIES).map(([key, cat]) => (
                    <MenuItem key={key} value={key}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip
                  label={`${filteredObjections.length} objeciones`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={showResolved ? 'Mostrando resueltas' : 'Solo pendientes'}
                  color={showResolved ? 'default' : 'warning'}
                  variant="outlined"
                  onClick={() => setShowResolved(!showResolved)}
                  clickable
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de objeciones */}
      {filteredObjections.length > 0 ? (
        <Grid container spacing={2}>
          {filteredObjections.map((objection) => {
            const field = OBJECTIONABLE_FIELDS.find(f => f.value === objection.field_name);
            const category = field ? FIELD_CATEGORIES[field.category] : null;
            
            return (
              <Grid item xs={12} key={objection.id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    borderLeft: '4px solid',
                    borderLeftColor: `${PRIORITY_COLORS[objection.priority]}.main`,
                    '&:hover': { elevation: 2 },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        {/* Header de la objeción */}
                        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                          <Avatar sx={{ 
                            bgcolor: `${PRIORITY_COLORS[objection.priority]}.main`,
                            width: 32,
                            height: 32,
                            mr: 2,
                          }}>
                            {objection.priority === 'CRITICAL' ? <ErrorIcon fontSize="small" /> :
                             objection.priority === 'HIGH' ? <WarningIcon fontSize="small" /> :
                             <InfoIcon fontSize="small" />}
                          </Avatar>
                          
                          <Box>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {field?.label || objection.field_name}
                            </Typography>
                            <Box display="flex" gap={1} alignItems="center">
                              <Chip 
                                label={PRIORITY_LABELS[objection.priority]} 
                                color={PRIORITY_COLORS[objection.priority]}
                                size="small"
                              />
                              <Chip 
                                label={STATUS_LABELS[objection.status]} 
                                color={STATUS_COLORS[objection.status]}
                                size="small"
                                variant="outlined"
                              />
                              {category && (
                                <Chip 
                                  label={category.label} 
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>

                        {/* Contenido de la objeción */}
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="caption" color="text.secondary">
                                Valor Actual
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {objection.current_value}
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                              <Typography variant="caption" color="text.secondary">
                                Valor Propuesto
                              </Typography>
                              <Typography variant="body2" fontWeight="medium" color="primary">
                                {objection.proposed_value}
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Fecha de Creación
                              </Typography>
                              <Typography variant="body2">
                                {format(new Date(objection.created_at), 'PPP', { locale: es })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({formatDistanceToNow(new Date(objection.created_at), { 
                                  addSuffix: true, 
                                  locale: es, 
                                })})
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Justificación */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Justificación
                          </Typography>
                          <Typography variant="body2">
                            {objection.justification}
                          </Typography>
                        </Box>

                        {/* Respuesta (si existe) */}
                        {objection.response_note && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Respuesta del {userType === 'landlord' ? 'Arrendatario' : 'Arrendador'}
                            </Typography>
                            <Typography variant="body2">
                              {objection.response_note}
                            </Typography>
                            {objection.responded_at && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {format(new Date(objection.responded_at), 'PPP', { locale: es })}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* Acciones */}
                      <Box display="flex" flexDirection="column" gap={1} sx={{ ml: 2 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedObjection(objection);
                              setViewObjectionDialog(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>

                        {/* Acciones para el arrendatario */}
                        {userType === 'tenant' && objection.objected_by_type === 'tenant' && objection.status === 'PENDING' && (
                          <Tooltip title="Retirar objeción">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => handleWithdrawObjection(objection.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Acciones para el arrendador */}
                        {canRespondObjections && objection.status === 'PENDING' && (
                          <Tooltip title="Responder objeción">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => {
                                setSelectedObjection(objection);
                                setRespondObjectionDialog(true);
                              }}
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Card>
          <CardContent>
            <Box textAlign="center" py={6}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                <CommentIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {objections.length === 0 
                  ? 'No hay objeciones presentadas'
                  : 'No hay objeciones que coincidan con los filtros'
                }
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {objections.length === 0 
                  ? 'Las objeciones permiten negociar términos específicos del contrato'
                  : 'Ajusta los filtros para ver más objeciones'
                }
              </Typography>
              
              {canCreateObjections && objections.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateObjectionDialog(true)}
                >
                  Presentar Primera Objeción
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* FAB para crear objeción */}
      {canCreateObjections && (
        <Fab
          color="primary"
          aria-label="Nueva objeción"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setCreateObjectionDialog(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog para crear objeción */}
      <Dialog
        open={createObjectionDialog}
        onClose={() => setCreateObjectionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CommentIcon sx={{ mr: 1 }} />
            Presentar Nueva Objeción
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={createObjectionFormik.handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Campo a Objetar</InputLabel>
                  <Select
                    name="field_name"
                    value={createObjectionFormik.values.field_name}
                    onChange={(e) => {
                      createObjectionFormik.handleChange(e);
                      const currentValue = getCurrentFieldValue(e.target.value);
                      createObjectionFormik.setFieldValue('current_value', currentValue);
                    }}
                    error={createObjectionFormik.touched.field_name && Boolean(createObjectionFormik.errors.field_name)}
                  >
                    {Object.entries(FIELD_CATEGORIES).map(([categoryKey, category]) => (
                      <Box key={categoryKey}>
                        <MenuItem disabled sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                          {category.label}
                        </MenuItem>
                        {OBJECTIONABLE_FIELDS
                          .filter(field => field.category === categoryKey)
                          .map(field => (
                            <MenuItem key={field.value} value={field.value} sx={{ pl: 4 }}>
                              {field.label}
                            </MenuItem>
                          ))
                        }
                      </Box>
                    ))}
                  </Select>
                  {createObjectionFormik.touched.field_name && createObjectionFormik.errors.field_name && (
                    <Typography variant="caption" color="error">
                      {createObjectionFormik.errors.field_name}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Valor Actual"
                  name="current_value"
                  value={createObjectionFormik.values.current_value}
                  onChange={createObjectionFormik.handleChange}
                  error={createObjectionFormik.touched.current_value && Boolean(createObjectionFormik.errors.current_value)}
                  helperText={createObjectionFormik.touched.current_value && createObjectionFormik.errors.current_value}
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Valor Propuesto"
                  name="proposed_value"
                  value={createObjectionFormik.values.proposed_value}
                  onChange={createObjectionFormik.handleChange}
                  error={createObjectionFormik.touched.proposed_value && Boolean(createObjectionFormik.errors.proposed_value)}
                  helperText={createObjectionFormik.touched.proposed_value && createObjectionFormik.errors.proposed_value}
                  placeholder="Tu propuesta de cambio"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    name="priority"
                    value={createObjectionFormik.values.priority}
                    onChange={createObjectionFormik.handleChange}
                  >
                    <MenuItem value="LOW">🟢 Baja - Preferencia personal</MenuItem>
                    <MenuItem value="MEDIUM">🟡 Media - Importante para mí</MenuItem>
                    <MenuItem value="HIGH">🟠 Alta - Muy importante</MenuItem>
                    <MenuItem value="CRITICAL">🔴 Crítica - Impide aceptar el contrato</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Justificación"
                  name="justification"
                  value={createObjectionFormik.values.justification}
                  onChange={createObjectionFormik.handleChange}
                  error={createObjectionFormik.touched.justification && Boolean(createObjectionFormik.errors.justification)}
                  helperText={createObjectionFormik.touched.justification && createObjectionFormik.errors.justification}
                  placeholder="Explica detalladamente por qué solicitas este cambio..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateObjectionDialog(false)}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={() => createObjectionFormik.handleSubmit()}
            loading={loading}
            variant="contained"
            startIcon={<SendIcon />}
          >
            Presentar Objeción
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Dialog para responder objeción */}
      <Dialog
        open={respondObjectionDialog}
        onClose={() => setRespondObjectionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Responder Objeción
        </DialogTitle>
        <DialogContent>
          {selectedObjection && (
            <Box sx={{ mt: 2 }}>
              {/* Resumen de la objeción */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Campo: {OBJECTIONABLE_FIELDS.find(f => f.value === selectedObjection.field_name)?.label}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Valor actual:</strong> {selectedObjection.current_value}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Valor propuesto:</strong> {selectedObjection.proposed_value}
                </Typography>
                <Typography variant="body2">
                  <strong>Justificación:</strong> {selectedObjection.justification}
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Decisión</InputLabel>
                    <Select
                      name="response"
                      value={respondObjectionFormik.values.response}
                      onChange={respondObjectionFormik.handleChange}
                    >
                      <MenuItem value="ACCEPTED">
                        <Box display="flex" alignItems="center">
                          <AcceptIcon sx={{ mr: 1, color: 'success.main' }} />
                          Aceptar Objeción
                        </Box>
                      </MenuItem>
                      <MenuItem value="REJECTED">
                        <Box display="flex" alignItems="center">
                          <RejectIcon sx={{ mr: 1, color: 'error.main' }} />
                          Rechazar Objeción
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Respuesta"
                    name="response_note"
                    value={respondObjectionFormik.values.response_note}
                    onChange={respondObjectionFormik.handleChange}
                    error={respondObjectionFormik.touched.response_note && Boolean(respondObjectionFormik.errors.response_note)}
                    helperText={respondObjectionFormik.touched.response_note && respondObjectionFormik.errors.response_note}
                    placeholder={
                      respondObjectionFormik.values.response === 'ACCEPTED' 
                        ? 'Explica los cambios que implementarás...'
                        : 'Explica por qué no puedes aceptar esta objeción...'
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondObjectionDialog(false)}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={() => respondObjectionFormik.handleSubmit()}
            loading={loading}
            variant="contained"
            color={respondObjectionFormik.values.response === 'ACCEPTED' ? 'success' : 'error'}
          >
            {respondObjectionFormik.values.response === 'ACCEPTED' ? 'Aceptar' : 'Rechazar'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Dialog para ver detalles de objeción */}
      <Dialog
        open={viewObjectionDialog}
        onClose={() => setViewObjectionDialog(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Detalles de la Objeción
        </DialogTitle>
        <DialogContent>
          {selectedObjection && (
            <Timeline>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot color="primary">
                    <CommentIcon />
                  </TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    Objeción Presentada
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(selectedObjection.created_at), 'PPpp', { locale: es })}
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1 }}>
                    <Typography variant="body2">
                      {selectedObjection.justification}
                    </Typography>
                  </Paper>
                </TimelineContent>
              </TimelineItem>

              {selectedObjection.responded_at && (
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color={selectedObjection.status === 'ACCEPTED' ? 'success' : 'error'}>
                      {selectedObjection.status === 'ACCEPTED' ? <AcceptIcon /> : <RejectIcon />}
                    </TimelineDot>
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="h6" component="span">
                      Objeción {STATUS_LABELS[selectedObjection.status]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(selectedObjection.responded_at), 'PPpp', { locale: es })}
                    </Typography>
                    {selectedObjection.response_note && (
                      <Paper sx={{ p: 2, mt: 1 }}>
                        <Typography variant="body2">
                          {selectedObjection.response_note}
                        </Typography>
                      </Paper>
                    )}
                  </TimelineContent>
                </TimelineItem>
              )}
            </Timeline>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewObjectionDialog(false)}>
            Cerrar
          </Button>
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

export default ContractObjectionsManager;