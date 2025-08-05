/**
 * LandlordContractForm - Nuevo sistema de contratos controlado por arrendador
 * Reemplaza ProfessionalContractForm con el sistema avanzado implementado
 * Integración completa con workflow biométrico y gestión profesional
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Autocomplete,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assignment as ContractIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Home as PropertyIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  AutoAwesome as TemplateIcon,
  Gavel as LegalIcon,
  Edit as EditIcon,
  AccountBalance as BankIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';

// Services y hooks del nuevo sistema
import { LandlordContractService } from '../../services/landlordContractService';
import { useAuth } from '../../hooks/useAuth';

// Types del nuevo sistema
import {
  LandlordControlledContractData,
  ContractWorkflowState, 
  PropertyType,
  DocumentType,
  LandlordData
} from '../../types/landlordContract';

// Utilidades
import { format, addMonths, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Templates de contratos profesionales
const PROFESSIONAL_CONTRACT_TEMPLATES = {
  residential_urban: {
    title: 'Vivienda Urbana - Ley 820 de 2003',
    description: 'Contrato estándar para vivienda urbana según normativa colombiana',
    icon: <PropertyIcon />,
    color: 'primary' as const,
    property_types: ['apartamento', 'casa'] as PropertyType[],
    recommended_duration: 12,
    clauses: [
      'Objeto del contrato y destinación del inmueble',
      'Canon de arrendamiento y forma de pago', 
      'Duración del contrato y renovación',
      'Depósito de garantía y seguros',
      'Obligaciones del arrendador',
      'Obligaciones del arrendatario',
      'Servicios públicos domiciliarios',
      'Causales de terminación',
      'Cláusula de permanencia mínima',
      'Reformas y mejoras al inmueble'
    ]
  },
  commercial_premises: {
    title: 'Local Comercial - Código de Comercio',
    description: 'Contrato para locales comerciales y oficinas',
    icon: <BusinessIcon />,
    color: 'secondary' as const,
    property_types: ['local_comercial', 'oficina'] as PropertyType[],
    recommended_duration: 36,
    clauses: [
      'Objeto y destinación comercial específica',
      'Canon comercial y incrementos anuales',
      'Duración y renovación automática',
      'Garantías comerciales y seguros',
      'Obligaciones específicas comerciales',
      'Uso de marca y publicidad exterior',
      'Adecuaciones y mejoras locativas',
      'Administración y gastos comunes',
      'Horarios de funcionamiento',
      'Transferencia y cesión del contrato'
    ]
  },
  warehouse_storage: {
    title: 'Bodega y Almacenamiento',
    description: 'Contrato especializado para bodegas industriales',
    icon: <BusinessIcon />,
    color: 'warning' as const,
    property_types: ['bodega'] as PropertyType[],
    recommended_duration: 24,
    clauses: [
      'Especificaciones técnicas de la bodega',
      'Capacidad de carga y restricciones',
      'Seguridad industrial y protocolos',
      'Manejo de mercancías peligrosas',
      'Seguros obligatorios especializados',
      'Acceso de vehículos pesados',
      'Mantenimiento de instalaciones',
      'Responsabilidad por daños'
    ]
  },
  rural_farm: {
    title: 'Finca Rural - Código Rural',
    description: 'Contrato para propiedades rurales y fincas',
    icon: <PropertyIcon />,
    color: 'success' as const,
    property_types: ['finca'] as PropertyType[],
    recommended_duration: 60,
    clauses: [
      'Descripción detallada del predio rural',
      'Uso agrícola, ganadero o turístico',
      'Servicios rurales y acceso a vías',
      'Manejo ambiental y sostenibilidad',
      'Seguridad rural y vigilancia',
      'Mantenimiento de cercas y caminos',
      'Derechos de agua y riego',
      'Cultivos existentes y nuevos'
    ]
  }
};

// Configuraciones por tipo de propiedad
const PROPERTY_CONFIGURATIONS = {
  apartamento: {
    deposit_months: [1, 2],
    typical_duration: [6, 12, 24],
    included_services: ['agua', 'luz', 'gas', 'internet', 'tv_cable', 'administracion'],
    common_clauses: ['no_mascotas', 'no_fiestas', 'horario_visitas']
  },
  casa: {
    deposit_months: [1, 2, 3],
    typical_duration: [12, 24, 36],
    included_services: ['agua', 'luz', 'gas', 'internet', 'jardineria', 'vigilancia'],
    common_clauses: ['mantenimiento_jardin', 'uso_piscina', 'mascotas_permitidas']
  },
  local_comercial: {
    deposit_months: [2, 3, 6],
    typical_duration: [12, 24, 36, 60],
    included_services: ['agua', 'luz', 'gas', 'internet', 'administracion', 'seguridad'],
    common_clauses: ['horario_comercial', 'publicidad_exterior', 'adecuaciones_permitidas']
  },
  oficina: {
    deposit_months: [1, 2, 3],
    typical_duration: [12, 24, 36],
    included_services: ['agua', 'luz', 'internet', 'administracion', 'seguridad', 'parqueadero'],
    common_clauses: ['horario_oficina', 'reunion_clientes', 'equipos_oficina']
  }
};

interface LandlordContractFormProps {
  propertyId?: string;
  isEdit?: boolean;
  contractId?: string;
  onSuccess?: (contract: LandlordControlledContractData) => void;
  onCancel?: () => void;
}

export const LandlordContractForm: React.FC<LandlordContractFormProps> = ({
  propertyId,
  isEdit = false,
  contractId,
  onSuccess,
  onCancel
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof PROFESSIONAL_CONTRACT_TEMPLATES>('residential_urban');
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Contract data state
  const [contractData, setContractData] = useState<Partial<LandlordControlledContractData>>({
    current_state: 'DRAFT',
    property_id: propertyId || '',
    property_type: 'apartamento',
    monthly_rent: 0,
    security_deposit: 0,
    contract_duration_months: 12,
    rent_increase_type: 'ipc',
    payment_day: 5,
    utilities_included: false,
    internet_included: false,
    pets_allowed: false,
    smoking_allowed: false,
    guests_policy: 'limited',
    max_occupants: 2,
    guarantor_required: true,
    guarantor_type: 'personal',
    maintenance_responsibility: 'tenant',
    utilities_responsibility: 'tenant',
    insurance_responsibility: 'tenant',
    special_clauses: [],
    landlord_approved: false,
    tenant_approved: false,
    landlord_signed: false,
    tenant_signed: false,
    published: false,
    workflow_history: []
  });

  // Landlord data state
  const [landlordData, setLandlordData] = useState<LandlordData>({
    full_name: user?.full_name || '',
    document_type: 'CC',
    document_number: '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    city: 'Medellín',
    department: 'Antioquia',
    country: 'Colombia',
    emergency_contact: '',
    emergency_phone: '',
    bank_account: '',
    bank_name: '',
    account_type: 'savings',
    profession: ''
  });

  // Property details state
  const [propertyData, setPropertyData] = useState({
    property_address: '',
    property_area: 0,
    property_stratum: 3,
    property_rooms: 2,
    property_bathrooms: 2,
    property_parking_spaces: 1,
    property_furnished: false
  });

  const steps = [
    'Información del Arrendador',
    'Detalles de la Propiedad', 
    'Condiciones Económicas',
    'Términos del Contrato',
    'Cláusulas Especiales',
    'Revisión y Creación'
  ];

  // Cargar datos si es edición
  useEffect(() => {
    if (isEdit && contractId) {
      loadContractData();
    }
  }, [isEdit, contractId]);

  const loadContractData = async () => {
    if (!contractId) return;
    
    try {
      setLoading(true);
      const contract = await LandlordContractService.getContract(contractId);
      setContractData(contract);
      if (contract.landlord_data) {
        setLandlordData(contract.landlord_data);
      }
    } catch (error) {
      console.error('Error al cargar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];

    switch (activeStep) {
      case 0: // Información del Arrendador
        if (!landlordData.full_name) errors.push('El nombre completo es requerido');
        if (!landlordData.document_number) errors.push('El número de documento es requerido');
        if (!landlordData.phone) errors.push('El teléfono es requerido');
        if (!landlordData.email) errors.push('El email es requerido');
        if (!landlordData.address) errors.push('La dirección es requerida');
        if (!landlordData.city) errors.push('La ciudad es requerida');
        break;

      case 1: // Detalles de la Propiedad
        if (!propertyData.property_address) errors.push('La dirección de la propiedad es requerida');
        if (!propertyData.property_area || propertyData.property_area <= 0) errors.push('El área debe ser mayor a 0');
        if (!contractData.property_type) errors.push('El tipo de propiedad es requerido');
        break;

      case 2: // Condiciones Económicas
        if (!contractData.monthly_rent || contractData.monthly_rent <= 0) errors.push('El canon mensual debe ser mayor a 0');
        if (!contractData.security_deposit || contractData.security_deposit < 0) errors.push('El depósito de garantía debe ser mayor o igual a 0');
        if (!contractData.contract_duration_months || contractData.contract_duration_months <= 0) errors.push('La duración debe ser mayor a 0');
        break;

      case 3: // Términos del Contrato
        if (!contractData.payment_day || contractData.payment_day < 1 || contractData.payment_day > 31) {
          errors.push('El día de pago debe estar entre 1 y 31');
        }
        break;

      case 4: // Cláusulas Especiales - opcional
        break;

      case 5: // Revisión final
        // Validar todo
        if (!landlordData.full_name || !landlordData.document_number || !propertyData.property_address || 
            !contractData.monthly_rent || contractData.monthly_rent <= 0) {
          errors.push('Hay campos requeridos sin completar en pasos anteriores');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    try {
      setLoading(true);

      // Preparar datos completos del contrato
      const completeContractData: Omit<LandlordControlledContractData, 'id' | 'created_at' | 'updated_at'> = {
        ...contractData,
        ...propertyData,
        landlord_data: landlordData,
        contract_number: '', // Se generará en el backend
        current_state: 'DRAFT',
        workflow_history: []
      } as Omit<LandlordControlledContractData, 'id' | 'created_at' | 'updated_at'>;

      let result: LandlordControlledContractData;

      if (isEdit && contractId) {
        result = await LandlordContractService.updateContract(contractId, completeContractData);
      } else {
        result = await LandlordContractService.createContract(completeContractData);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        navigate('/app/contracts/landlord');
      }

    } catch (error) {
      console.error('Error al guardar contrato:', error);
      setValidationErrors(['Error al guardar el contrato. Por favor intenta nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/app/contracts/landlord');
    }
  };

  const getRecommendedDeposit = (): number => {
    if (!contractData.property_type || !contractData.monthly_rent) return 0;
    
    const config = PROPERTY_CONFIGURATIONS[contractData.property_type];
    const recommendedMonths = config?.deposit_months[0] || 1;
    
    return contractData.monthly_rent * recommendedMonths;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Información del Arrendador
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Información del Arrendador
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Proporciona la información legal del propietario que aparecerá en el contrato
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre Completo *"
                value={landlordData.full_name}
                onChange={(e) => setLandlordData(prev => ({ ...prev, full_name: e.target.value }))}
                error={validationErrors.some(err => err.includes('nombre'))}
                helperText="Nombre completo como aparece en el documento de identidad"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento</InputLabel>
                <Select
                  value={landlordData.document_type}
                  onChange={(e) => setLandlordData(prev => ({ ...prev, document_type: e.target.value as DocumentType }))}
                  label="Tipo de Documento"
                >
                  <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                  <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                  <MenuItem value="PP">Pasaporte</MenuItem>
                  <MenuItem value="NI">NIT</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número de Documento *"
                value={landlordData.document_number}
                onChange={(e) => setLandlordData(prev => ({ ...prev, document_number: e.target.value }))}
                error={validationErrors.some(err => err.includes('documento'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono *"
                value={landlordData.phone}
                onChange={(e) => setLandlordData(prev => ({ ...prev, phone: e.target.value }))}
                error={validationErrors.some(err => err.includes('teléfono'))}
                placeholder="+57 300 123 4567"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={landlordData.email}
                onChange={(e) => setLandlordData(prev => ({ ...prev, email: e.target.value }))}
                error={validationErrors.some(err => err.includes('email'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Profesión"
                value={landlordData.profession}
                onChange={(e) => setLandlordData(prev => ({ ...prev, profession: e.target.value }))}
                placeholder="Ej: Ingeniero, Médico, Empresario"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección de Residencia *"
                value={landlordData.address}
                onChange={(e) => setLandlordData(prev => ({ ...prev, address: e.target.value }))}
                error={validationErrors.some(err => err.includes('dirección'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad *"
                value={landlordData.city}
                onChange={(e) => setLandlordData(prev => ({ ...prev, city: e.target.value }))}
                error={validationErrors.some(err => err.includes('ciudad'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Departamento"
                value={landlordData.department}
                onChange={(e) => setLandlordData(prev => ({ ...prev, department: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Contacto de Emergencia
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Contacto de Emergencia"
                value={landlordData.emergency_contact}
                onChange={(e) => setLandlordData(prev => ({ ...prev, emergency_contact: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono de Emergencia"
                value={landlordData.emergency_phone}
                onChange={(e) => setLandlordData(prev => ({ ...prev, emergency_phone: e.target.value }))}
              />
            </Grid>
          </Grid>
        );

      case 1: // Detalles de la Propiedad
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <PropertyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Detalles de la Propiedad
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Especifica las características de la propiedad a arrendar
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección Completa de la Propiedad *"
                value={propertyData.property_address}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_address: e.target.value }))}
                error={validationErrors.some(err => err.includes('dirección de la propiedad'))}
                helperText="Dirección exacta incluida nomenclatura y referencias"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Propiedad *</InputLabel>
                <Select
                  value={contractData.property_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, property_type: e.target.value as PropertyType }))}
                  label="Tipo de Propiedad *"
                >
                  <MenuItem value="apartamento">Apartamento</MenuItem>
                  <MenuItem value="casa">Casa</MenuItem>
                  <MenuItem value="local_comercial">Local Comercial</MenuItem>
                  <MenuItem value="oficina">Oficina</MenuItem>
                  <MenuItem value="bodega">Bodega</MenuItem>
                  <MenuItem value="habitacion">Habitación</MenuItem>
                  <MenuItem value="finca">Finca</MenuItem>
                  <MenuItem value="lote">Lote</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Área (m²) *"
                type="number"
                value={propertyData.property_area}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_area: Number(e.target.value) }))}
                error={validationErrors.some(err => err.includes('área'))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m²</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Estrato"
                type="number"
                value={propertyData.property_stratum}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_stratum: Number(e.target.value) }))}
                inputProps={{ min: 1, max: 6 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Habitaciones"
                type="number"
                value={propertyData.property_rooms}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_rooms: Number(e.target.value) }))}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Baños"
                type="number"
                value={propertyData.property_bathrooms}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_bathrooms: Number(e.target.value) }))}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Parqueaderos"
                type="number"
                value={propertyData.property_parking_spaces}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_parking_spaces: Number(e.target.value) }))}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={propertyData.property_furnished}
                    onChange={(e) => setPropertyData(prev => ({ ...prev, property_furnished: e.target.checked }))}
                  />
                }
                label="Propiedad Amoblada"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Template de Contrato Recomendado
              </Typography>

              <Grid container spacing={2}>
                {Object.entries(PROFESSIONAL_CONTRACT_TEMPLATES).map(([key, template]) => {
                  const isRecommended = template.property_types.includes(contractData.property_type as PropertyType);
                  
                  return (
                    <Grid item xs={12} md={6} key={key}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: selectedTemplate === key ? 2 : 1,
                          borderColor: selectedTemplate === key ? 'primary.main' : 'divider',
                          opacity: isRecommended ? 1 : 0.7,
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => setSelectedTemplate(key as keyof typeof PROFESSIONAL_CONTRACT_TEMPLATES)}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Box color={`${template.color}.main`} mr={1}>
                              {template.icon}
                            </Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {template.title}
                            </Typography>
                            {isRecommended && (
                              <Chip label="Recomendado" size="small" color="success" sx={{ ml: 1 }} />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {template.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.clauses.length} cláusulas • {template.recommended_duration} meses recomendados
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        );

      case 2: // Condiciones Económicas
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Condiciones Económicas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Define los términos económicos del contrato de arrendamiento
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Canon Mensual de Arrendamiento *"
                type="number"
                value={contractData.monthly_rent}
                onChange={(e) => setContractData(prev => ({ ...prev, monthly_rent: Number(e.target.value) }))}
                error={validationErrors.some(err => err.includes('canon mensual'))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Valor en pesos colombianos"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Depósito de Garantía"
                type="number"
                value={contractData.security_deposit}
                onChange={(e) => setContractData(prev => ({ ...prev, security_deposit: Number(e.target.value) }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText={`Recomendado: $${getRecommendedDeposit().toLocaleString('es-CO')}`}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duración del Contrato (meses) *"
                type="number"
                value={contractData.contract_duration_months}
                onChange={(e) => setContractData(prev => ({ ...prev, contract_duration_months: Number(e.target.value) }))}
                error={validationErrors.some(err => err.includes('duración'))}
                inputProps={{ min: 1 }}
                helperText={`Recomendado: ${PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].recommended_duration} meses`}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Incremento Anual</InputLabel>
                <Select
                  value={contractData.rent_increase_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, rent_increase_type: e.target.value as 'ipc' | 'fixed' | 'negotiated' }))}
                  label="Tipo de Incremento Anual"
                >
                  <MenuItem value="ipc">IPC (Índice de Precios al Consumidor)</MenuItem>
                  <MenuItem value="fixed">Porcentaje Fijo</MenuItem>
                  <MenuItem value="negotiated">Negociación Anual</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Día de Pago del Canon"
                type="number"
                value={contractData.payment_day}
                onChange={(e) => setContractData(prev => ({ ...prev, payment_day: Number(e.target.value) }))}
                inputProps={{ min: 1, max: 31 }}
                helperText="Día del mes para el pago (1-31)"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cálculo Automático de Fechas
                </Typography>
                <Typography variant="body2">
                  Las fechas de inicio y fin del contrato se establecerán cuando se invite al arrendatario.
                  El sistema calculará automáticamente {contractData.contract_duration_months} meses de duración.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 3: // Términos del Contrato
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Términos y Condiciones
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configura las condiciones específicas del arrendamiento
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Servicios Incluidos</Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.utilities_included}
                    onChange={(e) => setContractData(prev => ({ ...prev, utilities_included: e.target.checked }))}
                  />
                }
                label="Servicios Públicos Incluidos"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.internet_included}
                    onChange={(e) => setContractData(prev => ({ ...prev, internet_included: e.target.checked }))}
                  />
                }
                label="Internet Incluido"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Políticas de Uso</Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.pets_allowed}
                    onChange={(e) => setContractData(prev => ({ ...prev, pets_allowed: e.target.checked }))}
                  />
                }
                label="Mascotas Permitidas"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.smoking_allowed}
                    onChange={(e) => setContractData(prev => ({ ...prev, smoking_allowed: e.target.checked }))}
                  />
                }
                label="Fumar Permitido"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Política de Huéspedes</InputLabel>
                <Select
                  value={contractData.guests_policy}
                  onChange={(e) => setContractData(prev => ({ ...prev, guests_policy: e.target.value as 'no_guests' | 'limited' | 'unlimited' | 'no_overnight' }))}
                  label="Política de Huéspedes"
                >
                  <MenuItem value="no_guests">No se permiten huéspedes</MenuItem>
                  <MenuItem value="limited">Huéspedes limitados (previa autorización)</MenuItem>
                  <MenuItem value="unlimited">Huéspedes sin restricción</MenuItem>
                  <MenuItem value="no_overnight">Sin pernoctar</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Máximo de Ocupantes"
                type="number"
                value={contractData.max_occupants}
                onChange={(e) => setContractData(prev => ({ ...prev, max_occupants: Number(e.target.value) }))}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Garantías y Responsabilidades</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.guarantor_required}
                    onChange={(e) => setContractData(prev => ({ ...prev, guarantor_required: e.target.checked }))}
                  />
                }
                label="Codeudor Requerido"
              />
              
              {contractData.guarantor_required && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Tipo de Garantía</InputLabel>
                  <Select
                    value={contractData.guarantor_type}
                    onChange={(e) => setContractData(prev => ({ ...prev, guarantor_type: e.target.value as 'personal' | 'company' | 'bank' | 'insurance' }))}
                    label="Tipo de Garantía"
                  >
                    <MenuItem value="personal">Codeudor Personal</MenuItem>
                    <MenuItem value="company">Codeudor Empresa</MenuItem>
                    <MenuItem value="bank">Garantía Bancaria</MenuItem>
                    <MenuItem value="insurance">Seguro de Arrendamiento</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Responsabilidad del Mantenimiento</InputLabel>
                <Select
                  value={contractData.maintenance_responsibility}
                  onChange={(e) => setContractData(prev => ({ ...prev, maintenance_responsibility: e.target.value as 'landlord' | 'tenant' | 'both' }))}
                  label="Responsabilidad del Mantenimiento"
                >
                  <MenuItem value="landlord">Arrendador</MenuItem>
                  <MenuItem value="tenant">Arrendatario</MenuItem>
                  <MenuItem value="both">Compartida</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 4: // Cláusulas Especiales
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <LegalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Cláusulas Especiales
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Agrega cláusulas adicionales específicas para este contrato (opcional)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    Cláusulas del Template: {PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].title}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].clauses.map((clause, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={clause} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cláusulas Adicionales"
                multiline
                rows={6}
                value={contractData.special_clauses?.join('\n') || ''}
                onChange={(e) => {
                  const clauses = e.target.value.split('\n').filter(clause => clause.trim() !== '');
                  setContractData(prev => ({ ...prev, special_clauses: clauses }));
                }}
                helperText="Escribe cada cláusula en una línea separada. Estas se agregarán al template estándar."
                placeholder="Ejemplo:&#10;- El arrendatario se compromete a no realizar modificaciones estructurales&#10;- Prohibido el uso de la propiedad para fines comerciales&#10;- El canon se pagará mediante transferencia bancaria"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  📋 Template Incluido Automáticamente
                </Typography>
                <Typography variant="body2">
                  El contrato incluirá automáticamente todas las cláusulas estándar del template seleccionado, 
                  más cualquier cláusula adicional que agregues aquí. El contenido completo se generará al crear el contrato.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 5: // Revisión y Creación
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Revisión Final
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Revisa toda la información antes de crear el contrato
              </Typography>
            </Grid>

            {validationErrors.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Errores que deben corregirse:
                  </Typography>
                  <List dense>
                    {validationErrors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Resumen del Contrato
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">TEMPLATE</Typography>
                  <Typography variant="body1">{PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].title}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">ARRENDADOR</Typography>
                  <Typography variant="body1">{landlordData.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {landlordData.document_type} {landlordData.document_number}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">PROPIEDAD</Typography>
                  <Typography variant="body1">{propertyData.property_address}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {contractData.property_type} • {propertyData.property_area} m²
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">CONDICIONES ECONÓMICAS</Typography>
                  <Typography variant="body1">
                    Canon: ${contractData.monthly_rent?.toLocaleString('es-CO')} COP
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Depósito: ${contractData.security_deposit?.toLocaleString('es-CO')} COP
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duración: {contractData.contract_duration_months} meses
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">SERVICIOS Y POLÍTICAS</Typography>
                  <Typography variant="body2">
                    • Servicios públicos: {contractData.utilities_included ? 'Incluidos' : 'No incluidos'}
                  </Typography>
                  <Typography variant="body2">
                    • Internet: {contractData.internet_included ? 'Incluido' : 'No incluido'}
                  </Typography>
                  <Typography variant="body2">
                    • Mascotas: {contractData.pets_allowed ? 'Permitidas' : 'No permitidas'}
                  </Typography>
                  <Typography variant="body2">
                    • Codeudor: {contractData.guarantor_required ? 'Requerido' : 'No requerido'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  🚀 Próximos Pasos
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Crear contrato en estado BORRADOR"
                      secondary="El contrato se guardará con toda la información"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <SendIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Invitar al arrendatario"
                      secondary="Enviar invitación por email, SMS o WhatsApp"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <EditIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Revisión y negociación"
                      secondary="El arrendatario podrá revisar y hacer objeciones"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Firma biométrica digital"
                      secondary="Proceso de 5 pasos de verificación avanzada"
                    />
                  </ListItem>
                </List>

                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Una vez creado, podrás gestionar todo el proceso desde el 
                    <strong> Dashboard de Contratos del Arrendador</strong>
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <LinearProgress sx={{ width: '100%', mb: 2 }} />
              <Typography>Cargando información del contrato...</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <ContractIcon color="primary" />
              <Typography variant="h5">
                {isEdit ? 'Editar Contrato de Arrendador' : 'Nuevo Contrato - Sistema Controlado por Arrendador'}
              </Typography>
            </Box>
          }
          action={
            <Box display="flex" gap={1}>
              <Tooltip title="Vista previa del template">
                <IconButton onClick={() => setPreviewMode(true)}>
                  <PreviewIcon />
                </IconButton>
              </Tooltip>
              <Chip
                label={PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].title}
                color="primary"
                variant="outlined"
                icon={<TemplateIcon />}
              />
            </Box>
          }
        />
        
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  {renderStepContent(index)}
                  <Box sx={{ mb: 2, mt: 4 }}>
                    <LoadingButton
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      loading={loading}
                      sx={{ mr: 1 }}
                      size="large"
                    >
                      {index === steps.length - 1 ? 'Crear Contrato' : 'Continuar'}
                    </LoadingButton>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                      size="large"
                    >
                      Atrás
                    </Button>
                    <Button
                      onClick={handleCancel}
                      color="inherit"
                      size="large"
                    >
                      Cancelar
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewMode}
        onClose={() => setPreviewMode(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon color="primary" />
            Vista Previa del Template: {PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Cláusulas Incluidas:
            </Typography>
            <List>
              {PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].clauses.map((clause, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={clause} />
                </ListItem>
              ))}
            </List>
            
            {contractData.special_clauses && contractData.special_clauses.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Cláusulas Adicionales:
                </Typography>
                <List>
                  {contractData.special_clauses.map((clause, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <EditIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={clause} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                El contenido completo del contrato se generará automáticamente al crearlo, 
                incluyendo todas las cláusulas legales requeridas según la normativa colombiana.
              </Typography>
            </Alert>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewMode(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LandlordContractForm;