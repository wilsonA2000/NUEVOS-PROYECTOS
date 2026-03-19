/**
 * ModificationRequestModal Component - VERSIÓN MEJORADA
 *
 * Modal profesional para solicitar modificaciones al borrador del contrato.
 * Permite al arrendatario seleccionar exactamente qué sección del contrato
 * desea modificar, mapeando todas las secciones del PDF generado.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Paper,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import ContractModificationService from '../../services/contractModificationService';
import { RequestedChanges } from '../../types/landlordContract';

interface ModificationRequestModalProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  onSuccess?: () => void;
  contractData?: ContractData; // Datos del contrato para mostrar valores actuales
}

interface ContractData {
  landlord_data?: Record<string, unknown>;
  tenant_data?: Record<string, unknown>;
  property_data?: Record<string, unknown>;
  economic_terms?: Record<string, unknown>;
  contract_terms?: Record<string, unknown>;
  special_clauses?: Array<{ title: string; content: string }>;
}

interface ContractSection {
  id: string;
  category: string;
  categoryIcon: React.ReactNode;
  label: string;
  description: string;
  currentValue?: string;
}

interface SelectedChange {
  sectionId: string;
  sectionLabel: string;
  category: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
}

// Definición de todas las secciones del contrato mapeadas del PDF
const CONTRACT_SECTIONS: ContractSection[] = [
  // INFORMACIÓN DEL ARRENDADOR
  {
    id: 'landlord_name',
    category: 'Datos del Arrendador',
    categoryIcon: <PersonIcon />,
    label: 'Nombre completo del arrendador',
    description: 'Nombre que aparece en el encabezado del contrato',
  },
  {
    id: 'landlord_document',
    category: 'Datos del Arrendador',
    categoryIcon: <PersonIcon />,
    label: 'Documento de identidad del arrendador',
    description: 'Cédula o NIT del arrendador',
  },
  {
    id: 'landlord_address',
    category: 'Datos del Arrendador',
    categoryIcon: <PersonIcon />,
    label: 'Dirección del arrendador',
    description: 'Dirección de residencia o notificaciones',
  },
  {
    id: 'landlord_phone',
    category: 'Datos del Arrendador',
    categoryIcon: <PersonIcon />,
    label: 'Teléfono del arrendador',
    description: 'Número de contacto',
  },
  {
    id: 'landlord_email',
    category: 'Datos del Arrendador',
    categoryIcon: <PersonIcon />,
    label: 'Email del arrendador',
    description: 'Correo electrónico de contacto',
  },

  // INFORMACIÓN DE LA PROPIEDAD
  {
    id: 'property_address',
    category: 'Datos de la Propiedad',
    categoryIcon: <HomeIcon />,
    label: 'Dirección del inmueble',
    description: 'Dirección completa del inmueble arrendado',
  },
  {
    id: 'property_city',
    category: 'Datos de la Propiedad',
    categoryIcon: <HomeIcon />,
    label: 'Ciudad',
    description: 'Ciudad donde se ubica el inmueble',
  },
  {
    id: 'property_type',
    category: 'Datos de la Propiedad',
    categoryIcon: <HomeIcon />,
    label: 'Tipo de inmueble',
    description: 'Apartamento, casa, local, etc.',
  },
  {
    id: 'property_area',
    category: 'Datos de la Propiedad',
    categoryIcon: <HomeIcon />,
    label: 'Área del inmueble',
    description: 'Metros cuadrados',
  },
  {
    id: 'property_description',
    category: 'Datos de la Propiedad',
    categoryIcon: <HomeIcon />,
    label: 'Descripción del inmueble',
    description: 'Características generales',
  },

  // TÉRMINOS ECONÓMICOS
  {
    id: 'monthly_rent',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Canon mensual de arrendamiento',
    description: 'Valor del arriendo mensual',
  },
  {
    id: 'security_deposit',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Depósito de seguridad',
    description: 'Valor del depósito inicial',
  },
  {
    id: 'payment_method',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Método de pago',
    description: 'Forma en que se realizará el pago',
  },
  {
    id: 'payment_due_day',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Día de pago',
    description: 'Día del mes para realizar el pago',
  },
  {
    id: 'late_payment_fee',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Penalización por mora',
    description: 'Interés o cargo por pago tardío',
  },
  {
    id: 'rent_increment',
    category: 'Términos Económicos',
    categoryIcon: <MoneyIcon />,
    label: 'Incremento anual del canon',
    description: 'Porcentaje de incremento anual',
  },

  // TÉRMINOS DEL CONTRATO
  {
    id: 'contract_duration',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Duración del contrato',
    description: 'Período de vigencia en meses',
  },
  {
    id: 'start_date',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Fecha de inicio',
    description: 'Fecha de inicio del arrendamiento',
  },
  {
    id: 'end_date',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Fecha de finalización',
    description: 'Fecha de terminación del contrato',
  },
  {
    id: 'utilities_included',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Servicios públicos incluidos',
    description: 'Si incluye agua, luz, gas, etc.',
  },
  {
    id: 'pets_allowed',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Mascotas permitidas',
    description: 'Política sobre mascotas',
  },
  {
    id: 'smoking_allowed',
    category: 'Términos del Contrato',
    categoryIcon: <ScheduleIcon />,
    label: 'Fumar permitido',
    description: 'Política sobre fumar en el inmueble',
  },

  // CLÁUSULAS LEGALES
  {
    id: 'clause_1_objeto',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 1 - OBJETO',
    description: 'Definición del objeto del arrendamiento',
  },
  {
    id: 'clause_2_destinacion',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 2 - DESTINACIÓN',
    description: 'Uso permitido del inmueble',
  },
  {
    id: 'clause_3_precio',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 3 - PRECIO',
    description: 'Condiciones del canon de arrendamiento',
  },
  {
    id: 'clause_4_vigencia',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 4 - VIGENCIA',
    description: 'Duración y renovación del contrato',
  },
  {
    id: 'clause_5_servicios',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 5 - SERVICIOS PÚBLICOS',
    description: 'Responsabilidades sobre servicios',
  },
  {
    id: 'clause_6_obligaciones_arrendatario',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 6 - OBLIGACIONES DEL ARRENDATARIO',
    description: 'Deberes del arrendatario',
  },
  {
    id: 'clause_7_obligaciones_arrendador',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 7 - OBLIGACIONES DEL ARRENDADOR',
    description: 'Deberes del arrendador',
  },
  {
    id: 'clause_8_terminacion',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 8 - TERMINACIÓN',
    description: 'Causales de terminación del contrato',
  },
  {
    id: 'clause_9_restitucion',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULA 9 - RESTITUCIÓN',
    description: 'Condiciones de devolución del inmueble',
  },
  {
    id: 'clause_especial',
    category: 'Cláusulas del Contrato',
    categoryIcon: <GavelIcon />,
    label: 'CLÁUSULAS ESPECIALES',
    description: 'Cláusulas adicionales personalizadas',
  },

  // GARANTÍAS
  {
    id: 'guarantee_type',
    category: 'Garantías',
    categoryIcon: <SecurityIcon />,
    label: 'Tipo de garantía requerida',
    description: 'Codeudor, depósito adicional, etc.',
  },
  {
    id: 'guarantee_amount',
    category: 'Garantías',
    categoryIcon: <SecurityIcon />,
    label: 'Monto de la garantía',
    description: 'Valor de la garantía adicional',
  },
  {
    id: 'codeudor_requirements',
    category: 'Garantías',
    categoryIcon: <SecurityIcon />,
    label: 'Requisitos del codeudor',
    description: 'Condiciones que debe cumplir el codeudor',
  },

  // FIRMAS
  {
    id: 'signature_section',
    category: 'Sección de Firmas',
    categoryIcon: <AssignmentIcon />,
    label: 'Información de firmas',
    description: 'Datos que aparecen en la sección de firmas',
  },
];

// Agrupar secciones por categoría
const groupSectionsByCategory = (sections: ContractSection[]) => {
  const grouped: Record<string, ContractSection[]> = {};
  sections.forEach(section => {
    if (!grouped[section.category]) {
      grouped[section.category] = [];
    }
    grouped[section.category]!.push(section);
  });
  return grouped;
};

const ModificationRequestModal: React.FC<ModificationRequestModalProps> = ({
  open,
  onClose,
  contractId,
  onSuccess,
  contractData,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generalReason, setGeneralReason] = useState('');
  const [selectedChanges, setSelectedChanges] = useState<SelectedChange[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | false>('Términos Económicos');
  const [step, setStep] = useState<'select' | 'details'>('select');

  const groupedSections = useMemo(() => groupSectionsByCategory(CONTRACT_SECTIONS), []);

  /**
   * Obtiene el valor actual de una sección desde los datos del contrato
   */
  const getCurrentValue = (sectionId: string): string => {
    if (!contractData) return '';

    const mappings: Record<string, () => string> = {
      // Arrendador
      landlord_name: () => String(contractData.landlord_data?.full_name || contractData.landlord_data?.name || ''),
      landlord_document: () => String(contractData.landlord_data?.document_number || ''),
      landlord_address: () => String(contractData.landlord_data?.address || ''),
      landlord_phone: () => String(contractData.landlord_data?.phone || ''),
      landlord_email: () => String(contractData.landlord_data?.email || ''),
      // Propiedad
      property_address: () => String(contractData.property_data?.address || contractData.property_data?.property_address || ''),
      property_city: () => String(contractData.property_data?.city || ''),
      property_type: () => String(contractData.property_data?.property_type || ''),
      property_area: () => String(contractData.property_data?.area || contractData.property_data?.property_area || ''),
      property_description: () => String(contractData.property_data?.description || ''),
      // Económicos
      monthly_rent: () => {
        const rent = contractData.economic_terms?.monthly_rent;
        return rent ? `$${Number(rent).toLocaleString('es-CO')} COP` : '';
      },
      security_deposit: () => {
        const deposit = contractData.economic_terms?.security_deposit;
        return deposit ? `$${Number(deposit).toLocaleString('es-CO')} COP` : '';
      },
      payment_method: () => String(contractData.economic_terms?.payment_method || ''),
      payment_due_day: () => String(contractData.economic_terms?.payment_due_day || contractData.contract_terms?.payment_due_day || ''),
      late_payment_fee: () => String(contractData.economic_terms?.late_payment_fee || ''),
      rent_increment: () => String(contractData.economic_terms?.rent_increment_percentage || ''),
      // Términos
      contract_duration: () => {
        const months = contractData.contract_terms?.contract_duration_months;
        return months ? `${months} meses` : '';
      },
      start_date: () => String(contractData.contract_terms?.start_date || ''),
      end_date: () => String(contractData.contract_terms?.end_date || ''),
      utilities_included: () => contractData.contract_terms?.utilities_included ? 'Sí' : 'No',
      pets_allowed: () => contractData.contract_terms?.pets_allowed ? 'Sí' : 'No',
      smoking_allowed: () => contractData.contract_terms?.smoking_allowed ? 'Sí' : 'No',
      // Garantías
      guarantee_type: () => String(contractData.contract_terms?.guarantee_type || 'No especificado'),
      guarantee_amount: () => {
        const amount = contractData.contract_terms?.guarantee_amount;
        return amount ? `$${Number(amount).toLocaleString('es-CO')} COP` : '';
      },
    };

    return mappings[sectionId]?.() || '';
  };

  /**
   * Alterna la selección de una sección
   */
  const handleToggleSection = (section: ContractSection) => {
    const existingIndex = selectedChanges.findIndex(c => c.sectionId === section.id);

    if (existingIndex >= 0) {
      // Remover
      setSelectedChanges(prev => prev.filter(c => c.sectionId !== section.id));
    } else {
      // Agregar
      setSelectedChanges(prev => [
        ...prev,
        {
          sectionId: section.id,
          sectionLabel: section.label,
          category: section.category,
          currentValue: getCurrentValue(section.id),
          requestedValue: '',
          reason: '',
        },
      ]);
    }
  };

  /**
   * Actualiza los detalles de un cambio
   */
  const handleUpdateChange = (
    sectionId: string,
    field: 'currentValue' | 'requestedValue' | 'reason',
    value: string
  ) => {
    setSelectedChanges(prev =>
      prev.map(change =>
        change.sectionId === sectionId ? { ...change, [field]: value } : change
      )
    );
  };

  /**
   * Elimina un cambio de la lista
   */
  const handleRemoveChange = (sectionId: string) => {
    setSelectedChanges(prev => prev.filter(c => c.sectionId !== sectionId));
  };

  /**
   * Valida el formulario antes de enviar
   */
  const validateForm = (): boolean => {
    if (selectedChanges.length === 0) {
      setError('Debe seleccionar al menos una sección del contrato para modificar');
      return false;
    }

    for (const change of selectedChanges) {
      if (!change.requestedValue.trim()) {
        setError(`Debe especificar el valor solicitado para: ${change.sectionLabel}`);
        return false;
      }
      if (!change.reason.trim()) {
        setError(`Debe proporcionar una razón para el cambio en: ${change.sectionLabel}`);
        return false;
      }
    }

    if (!generalReason.trim()) {
      setError('Debe proporcionar una justificación general');
      return false;
    }

    return true;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Convertir selectedChanges a RequestedChanges
      const requestedChanges: RequestedChanges = {};
      selectedChanges.forEach(change => {
        requestedChanges[change.sectionLabel] = {
          current_value: change.currentValue || 'No especificado',
          requested_value: change.requestedValue,
          reason: change.reason,
        };
      });

      // Enviar solicitud
      await ContractModificationService.createModificationRequest({
        contract: contractId,
        requested_changes: requestedChanges,
        reason: generalReason,
      });

      // Éxito
      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string; contract?: string[] } } };
      const errorMessage =
        errorObj.response?.data?.detail ||
        errorObj.response?.data?.message ||
        (errorObj.response?.data?.contract && errorObj.response?.data?.contract[0]) ||
        'Error al crear la solicitud de modificación';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra el modal y resetea el formulario
   */
  const handleClose = () => {
    if (!loading) {
      setSelectedChanges([]);
      setGeneralReason('');
      setError(null);
      setStep('select');
      setExpandedCategory('Términos Económicos');
      onClose();
    }
  };

  /**
   * Avanza al paso de detalles
   */
  const handleContinue = () => {
    if (selectedChanges.length === 0) {
      setError('Seleccione al menos una sección del contrato para modificar');
      return;
    }
    setError(null);
    setStep('details');
  };

  /**
   * Vuelve al paso de selección
   */
  const handleBack = () => {
    setStep('select');
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Datos del Arrendador': <PersonIcon />,
      'Datos de la Propiedad': <HomeIcon />,
      'Términos Económicos': <MoneyIcon />,
      'Términos del Contrato': <ScheduleIcon />,
      'Cláusulas del Contrato': <GavelIcon />,
      'Garantías': <SecurityIcon />,
      'Sección de Firmas': <AssignmentIcon />,
    };
    return iconMap[category] || <DescriptionIcon />;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
        }}
      >
        <EditIcon />
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          Solicitar Modificación al Contrato
        </Typography>
        <Chip
          label={step === 'select' ? 'Paso 1: Selección' : 'Paso 2: Detalles'}
          size="small"
          sx={{ bgcolor: alpha('#fff', 0.2), color: 'white' }}
        />
        <IconButton edge="end" onClick={handleClose} disabled={loading} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* Content */}
      <DialogContent sx={{ pt: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === 'select' ? (
          /* PASO 1: Selección de secciones */
          <>
            <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Paso 1:</strong> Seleccione las secciones del contrato que desea modificar.
                Puede seleccionar múltiples secciones. Tiene un máximo de 2 ciclos de revisión.
              </Typography>
            </Alert>

            {selectedChanges.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                }}
              >
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  <CheckCircleIcon sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                  {selectedChanges.length} sección(es) seleccionada(s)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedChanges.map(change => (
                    <Chip
                      key={change.sectionId}
                      label={change.sectionLabel}
                      size="small"
                      onDelete={() => handleRemoveChange(change.sectionId)}
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Paper>
            )}

            <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
              {Object.entries(groupedSections).map(([category, sections]) => (
                <Accordion
                  key={category}
                  expanded={expandedCategory === category}
                  onChange={(_, isExpanded) => setExpandedCategory(isExpanded ? category : false)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(category)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category}
                      </Typography>
                      <Chip
                        label={`${sections.filter(s => selectedChanges.some(c => c.sectionId === s.id)).length}/${sections.length}`}
                        size="small"
                        color={sections.some(s => selectedChanges.some(c => c.sectionId === s.id)) ? 'primary' : 'default'}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List dense>
                      {sections.map(section => {
                        const isSelected = selectedChanges.some(c => c.sectionId === section.id);
                        const currentVal = getCurrentValue(section.id);

                        return (
                          <ListItem
                            key={section.id}
                            disablePadding
                            secondaryAction={
                              currentVal && (
                                <Tooltip title={`Valor actual: ${currentVal}`}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      maxWidth: 150,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'block',
                                    }}
                                  >
                                    {currentVal}
                                  </Typography>
                                </Tooltip>
                              )
                            }
                          >
                            <ListItemButton
                              onClick={() => handleToggleSection(section)}
                              sx={{
                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                              }}
                            >
                              <ListItemIcon>
                                <Checkbox
                                  edge="start"
                                  checked={isSelected}
                                  tabIndex={-1}
                                  disableRipple
                                  color="primary"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={section.label}
                                secondary={section.description}
                                primaryTypographyProps={{
                                  fontWeight: isSelected ? 'bold' : 'normal',
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </>
        ) : (
          /* PASO 2: Detalles de los cambios */
          <>
            <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Paso 2:</strong> Complete los detalles de cada cambio solicitado.
                Sea específico en lo que desea modificar y la razón.
              </Typography>
            </Alert>

            <Stack spacing={3}>
              {/* Cambios Seleccionados */}
              {selectedChanges.map((change, index) => (
                <Paper key={change.sectionId} elevation={2} sx={{ p: 2, position: 'relative' }}>
                  {/* Header del cambio */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Chip
                      icon={getCategoryIcon(change.category) as React.ReactElement}
                      label={`${index + 1}. ${change.sectionLabel}`}
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {change.category}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveChange(change.sectionId)}
                      disabled={loading}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Stack spacing={2}>
                    {/* Valor actual (informativo) */}
                    {change.currentValue && (
                      <TextField
                        fullWidth
                        label="Valor Actual en el Contrato"
                        value={change.currentValue}
                        disabled
                        size="small"
                        InputProps={{
                          readOnly: true,
                        }}
                        helperText="Este es el valor actual que aparece en el borrador"
                      />
                    )}

                    {/* Valor solicitado */}
                    <TextField
                      fullWidth
                      label="Valor Solicitado (Nuevo)"
                      placeholder="Escriba el nuevo valor que desea..."
                      value={change.requestedValue}
                      onChange={e => handleUpdateChange(change.sectionId, 'requestedValue', e.target.value)}
                      disabled={loading}
                      required
                      multiline={change.sectionId.startsWith('clause_')}
                      rows={change.sectionId.startsWith('clause_') ? 3 : 1}
                    />

                    {/* Razón del cambio */}
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Razón del Cambio"
                      placeholder="Explique por qué solicita este cambio..."
                      value={change.reason}
                      onChange={e => handleUpdateChange(change.sectionId, 'reason', e.target.value)}
                      disabled={loading}
                      required
                    />
                  </Stack>
                </Paper>
              ))}

              {/* Justificación General */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="primary" />
                  Justificación General
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Resumen General de su Solicitud"
                  placeholder="Explique de manera general por qué solicita estas modificaciones al contrato. Este mensaje lo verá el arrendador..."
                  value={generalReason}
                  onChange={e => setGeneralReason(e.target.value)}
                  disabled={loading}
                  required
                  helperText="Sea claro y respetuoso en su justificación. El arrendador evaluará su solicitud."
                />
              </Box>
            </Stack>
          </>
        )}
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {step === 'select' ? (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={selectedChanges.length === 0}
              endIcon={<EditIcon />}
            >
              Continuar ({selectedChanges.length} seleccionados)
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleBack} disabled={loading}>
              Volver
            </Button>
            <Button onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton
              variant="contained"
              onClick={handleSubmit}
              loading={loading}
              loadingPosition="start"
              startIcon={<EditIcon />}
              color="primary"
            >
              Enviar Solicitud de Modificación
            </LoadingButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ModificationRequestModal;
