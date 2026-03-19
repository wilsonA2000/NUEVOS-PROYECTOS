/**
 * Plantilla de Contrato de Arrendamiento - Sistema Controlado por Arrendador
 * Basada en legislación colombiana (Ley 820 de 2003)
 * Implementa workflow paso a paso con validación jurídica
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Article as ArticleIcon,
  AccountBalance as AccountBalanceIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Tipos TypeScript
interface ContractData {
  // Información de la propiedad
  property_id: string;
  property_address: string;
  property_type: 'apartamento' | 'casa' | 'local_comercial' | 'oficina' | 'bodega';
  property_area: number;
  property_stratum: number;
  
  // Términos económicos
  monthly_rent: number;
  security_deposit: number;
  administration_fee?: number;
  utilities_deposit?: number;
  
  // Términos del contrato
  contract_duration_months: number;
  start_date: string;
  rent_increase_type: 'fixed' | 'ipc' | 'negotiated';
  rent_increase_percentage?: number;
  
  // Servicios incluidos
  utilities_included: boolean;
  internet_included: boolean;
  cable_tv_included: boolean;
  cleaning_service_included: boolean;
  
  // Políticas de la propiedad
  pets_allowed: boolean;
  pet_deposit?: number;
  smoking_allowed: boolean;
  guests_policy: 'unlimited' | 'limited' | 'no_overnight';
  max_occupants: number;
  
  // Garantías
  guarantor_required: boolean;
  guarantor_type: 'personal' | 'company' | 'insurance' | 'deposit';
  
  // Cláusulas especiales
  special_clauses: string[];
  maintenance_responsibility: 'landlord' | 'tenant' | 'shared';
  
  // Datos del arrendador (se completarán paso a paso)
  landlord_data: {
    full_name: string;
    document_type: 'CC' | 'CE' | 'NIT';
    document_number: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    emergency_contact: string;
    bank_account?: string;
  };
}

interface LandlordContractTemplateProps {
  propertyId: string;
  initialData?: Partial<ContractData>;
  onSave: (data: ContractData) => void;
  onSendInvitation: (data: ContractData) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

const contractSteps = [
  { label: 'Información Básica', icon: <HomeIcon /> },
  { label: 'Términos Económicos', icon: <AccountBalanceIcon /> },
  { label: 'Políticas y Servicios', icon: <SecurityIcon /> },
  { label: 'Datos del Arrendador', icon: <PersonIcon /> },
  { label: 'Revisión Final', icon: <GavelIcon /> },
];

const validationSchema = Yup.object({
  monthly_rent: Yup.number()
    .required('El canon mensual es obligatorio')
    .min(100000, 'El canon debe ser mínimo $100,000')
    .max(50000000, 'El canon no puede exceder $50,000,000'),
  security_deposit: Yup.number()
    .required('El depósito de garantía es obligatorio')
    .min(0, 'El depósito no puede ser negativo'),
  contract_duration_months: Yup.number()
    .required('La duración del contrato es obligatoria')
    .min(1, 'Mínimo 1 mes')
    .max(60, 'Máximo 5 años'),
  property_area: Yup.number()
    .required('El área de la propiedad es obligatoria')
    .min(10, 'Área mínima 10 m²'),
  max_occupants: Yup.number()
    .required('Número máximo de ocupantes requerido')
    .min(1, 'Mínimo 1 ocupante')
    .max(20, 'Máximo 20 ocupantes'),
  landlord_data: Yup.object({
    full_name: Yup.string().required('Nombre completo requerido'),
    document_number: Yup.string().required('Número de documento requerido'),
    phone: Yup.string().required('Teléfono requerido'),
    email: Yup.string().email('Email inválido').required('Email requerido'),
    address: Yup.string().required('Dirección requerida'),
    city: Yup.string().required('Ciudad requerida'),
    emergency_contact: Yup.string().required('Contacto de emergencia requerido'),
  }),
});

export const LandlordContractTemplate: React.FC<LandlordContractTemplateProps> = ({
  propertyId,
  initialData,
  onSave,
  onSendInvitation,
  isLoading = false,
  readOnly = false,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic_info']);
  const [isDirty, setIsDirty] = useState(false);

  const formik = useFormik<ContractData>({
    initialValues: {
      property_id: propertyId,
      property_address: '',
      property_type: 'apartamento',
      property_area: 0,
      property_stratum: 3,
      monthly_rent: 0,
      security_deposit: 0,
      administration_fee: 0,
      utilities_deposit: 0,
      contract_duration_months: 12,
      start_date: new Date().toISOString().split('T')[0] ?? '',
      rent_increase_type: 'ipc',
      rent_increase_percentage: 0,
      utilities_included: false,
      internet_included: false,
      cable_tv_included: false,
      cleaning_service_included: false,
      pets_allowed: false,
      pet_deposit: 0,
      smoking_allowed: false,
      guests_policy: 'limited',
      max_occupants: 2,
      guarantor_required: true,
      guarantor_type: 'personal',
      special_clauses: [],
      maintenance_responsibility: 'shared',
      landlord_data: {
        full_name: '',
        document_type: 'CC',
        document_number: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        emergency_contact: '',
        bank_account: '',
      },
      ...initialData,
    },
    validationSchema,
    onSubmit: (values) => {
      onSave(values);
    },
  });

  useEffect(() => {
    setIsDirty(formik.dirty);
  }, [formik.dirty]);

  // Funciones auxiliares
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotalDeposits = (): number => {
    const { security_deposit, utilities_deposit = 0, pet_deposit = 0 } = formik.values;
    return security_deposit + utilities_deposit + (formik.values.pets_allowed ? pet_deposit : 0);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section],
    );
  };

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, contractSteps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const getStepCompletion = (step: number): boolean => {
    switch (step) {
      case 0: // Información Básica
        return !!(formik.values.property_address && formik.values.property_area && formik.values.property_stratum);
      case 1: // Términos Económicos
        return !!(formik.values.monthly_rent && formik.values.security_deposit && formik.values.contract_duration_months);
      case 2: // Políticas
        return formik.values.max_occupants > 0;
      case 3: // Datos Arrendador
        return !!(
          formik.values.landlord_data.full_name &&
          formik.values.landlord_data.document_number &&
          formik.values.landlord_data.phone &&
          formik.values.landlord_data.email &&
          formik.values.landlord_data.address
        );
      case 4: // Revisión
        return getStepCompletion(0) && getStepCompletion(1) && getStepCompletion(2) && getStepCompletion(3);
      default:
        return false;
    }
  };

  const renderBasicInfo = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <HomeIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Información de la Propiedad</Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección Completa"
              name="property_address"
              value={formik.values.property_address}
              onChange={formik.handleChange}
              error={formik.touched.property_address && Boolean(formik.errors.property_address)}
              helperText={formik.touched.property_address && formik.errors.property_address}
              disabled={readOnly}
              placeholder="Ej: Carrera 15 #85-32, Apartamento 501"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Propiedad</InputLabel>
              <Select
                name="property_type"
                value={formik.values.property_type}
                onChange={formik.handleChange}
                disabled={readOnly}
              >
                <MenuItem value="apartamento">Apartamento</MenuItem>
                <MenuItem value="casa">Casa</MenuItem>
                <MenuItem value="local_comercial">Local Comercial</MenuItem>
                <MenuItem value="oficina">Oficina</MenuItem>
                <MenuItem value="bodega">Bodega</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Área (m²)"
              name="property_area"
              type="number"
              value={formik.values.property_area}
              onChange={formik.handleChange}
              error={formik.touched.property_area && Boolean(formik.errors.property_area)}
              helperText={formik.touched.property_area && formik.errors.property_area}
              disabled={readOnly}
              InputProps={{
                endAdornment: <InputAdornment position="end">m²</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Estrato</InputLabel>
              <Select
                name="property_stratum"
                value={formik.values.property_stratum}
                onChange={formik.handleChange}
                disabled={readOnly}
              >
                {[1, 2, 3, 4, 5, 6].map(stratum => (
                  <MenuItem key={stratum} value={stratum}>
                    Estrato {stratum}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderEconomicTerms = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Términos Económicos</Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Canon Mensual"
              name="monthly_rent"
              type="number"
              value={formik.values.monthly_rent}
              onChange={formik.handleChange}
              error={formik.touched.monthly_rent && Boolean(formik.errors.monthly_rent)}
              helperText={formik.touched.monthly_rent && formik.errors.monthly_rent}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Depósito de Garantía"
              name="security_deposit"
              type="number"
              value={formik.values.security_deposit}
              onChange={formik.handleChange}
              error={formik.touched.security_deposit && Boolean(formik.errors.security_deposit)}
              helperText={formik.touched.security_deposit && formik.errors.security_deposit}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cuota de Administración (Opcional)"
              name="administration_fee"
              type="number"
              value={formik.values.administration_fee}
              onChange={formik.handleChange}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Depósito de Servicios (Opcional)"
              name="utilities_deposit"
              type="number"
              value={formik.values.utilities_deposit}
              onChange={formik.handleChange}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Duración del Contrato (meses)"
              name="contract_duration_months"
              type="number"
              value={formik.values.contract_duration_months}
              onChange={formik.handleChange}
              error={formik.touched.contract_duration_months && Boolean(formik.errors.contract_duration_months)}
              helperText={formik.touched.contract_duration_months && formik.errors.contract_duration_months}
              disabled={readOnly}
              InputProps={{
                endAdornment: <InputAdornment position="end">meses</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Incremento Anual</InputLabel>
              <Select
                name="rent_increase_type"
                value={formik.values.rent_increase_type}
                onChange={formik.handleChange}
                disabled={readOnly}
              >
                <MenuItem value="ipc">IPC (Índice de Precios al Consumidor)</MenuItem>
                <MenuItem value="fixed">Porcentaje Fijo</MenuItem>
                <MenuItem value="negotiated">Negociado Anualmente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {formik.values.rent_increase_type === 'fixed' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Porcentaje de Incremento Anual"
                name="rent_increase_percentage"
                type="number"
                value={formik.values.rent_increase_percentage}
                onChange={formik.handleChange}
                disabled={readOnly}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 20, step: 0.1 }}
              />
            </Grid>
          )}
        </Grid>
        
        <Box mt={3} p={2} bgcolor="primary.50" borderRadius={1}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            💰 Resumen Económico
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Canon Mensual:</strong> {formatCurrency(formik.values.monthly_rent)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Total Depósitos:</strong> {formatCurrency(calculateTotalDeposits())}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Canon Anual:</strong> {formatCurrency(formik.values.monthly_rent * 12)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Total Inicial:</strong> {formatCurrency(formik.values.monthly_rent + calculateTotalDeposits())}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );

  const renderPoliciesAndServices = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SecurityIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Políticas y Servicios</Typography>
        </Box>
        
        <Grid container spacing={3}>
          {/* Servicios Incluidos */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Servicios Incluidos en el Canon
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.utilities_included}
                      onChange={formik.handleChange}
                      name="utilities_included"
                      disabled={readOnly}
                    />
                  }
                  label="Servicios Públicos"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.internet_included}
                      onChange={formik.handleChange}
                      name="internet_included"
                      disabled={readOnly}
                    />
                  }
                  label="Internet"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.cable_tv_included}
                      onChange={formik.handleChange}
                      name="cable_tv_included"
                      disabled={readOnly}
                    />
                  }
                  label="TV Cable"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.cleaning_service_included}
                      onChange={formik.handleChange}
                      name="cleaning_service_included"
                      disabled={readOnly}
                    />
                  }
                  label="Servicio de Aseo"
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          {/* Políticas de la Propiedad */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Políticas de la Propiedad
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.pets_allowed}
                      onChange={formik.handleChange}
                      name="pets_allowed"
                      disabled={readOnly}
                    />
                  }
                  label="Mascotas Permitidas"
                />
                {formik.values.pets_allowed && (
                  <TextField
                    fullWidth
                    label="Depósito por Mascota"
                    name="pet_deposit"
                    type="number"
                    value={formik.values.pet_deposit}
                    onChange={formik.handleChange}
                    disabled={readOnly}
                    size="small"
                    sx={{ mt: 1 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                )}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.smoking_allowed}
                      onChange={formik.handleChange}
                      name="smoking_allowed"
                      disabled={readOnly}
                    />
                  }
                  label="Fumar Permitido"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo de Ocupantes"
                  name="max_occupants"
                  type="number"
                  value={formik.values.max_occupants}
                  onChange={formik.handleChange}
                  error={formik.touched.max_occupants && Boolean(formik.errors.max_occupants)}
                  helperText={formik.touched.max_occupants && formik.errors.max_occupants}
                  disabled={readOnly}
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Política de Huéspedes</InputLabel>
                  <Select
                    name="guests_policy"
                    value={formik.values.guests_policy}
                    onChange={formik.handleChange}
                    disabled={readOnly}
                  >
                    <MenuItem value="unlimited">Sin Restricciones</MenuItem>
                    <MenuItem value="limited">Limitado (máx. 2 noches)</MenuItem>
                    <MenuItem value="no_overnight">No Pernoctar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Responsabilidad de Mantenimiento</InputLabel>
                  <Select
                    name="maintenance_responsibility"
                    value={formik.values.maintenance_responsibility}
                    onChange={formik.handleChange}
                    disabled={readOnly}
                  >
                    <MenuItem value="landlord">Arrendador</MenuItem>
                    <MenuItem value="tenant">Arrendatario</MenuItem>
                    <MenuItem value="shared">Compartido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          {/* Garantías */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Garantías
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.guarantor_required}
                      onChange={formik.handleChange}
                      name="guarantor_required"
                      disabled={readOnly}
                    />
                  }
                  label="Requiere Garantía"
                />
              </Grid>
              
              {formik.values.guarantor_required && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Garantía</InputLabel>
                    <Select
                      name="guarantor_type"
                      value={formik.values.guarantor_type}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    >
                      <MenuItem value="personal">Codeudor Personal</MenuItem>
                      <MenuItem value="company">Codeudor Empresa</MenuItem>
                      <MenuItem value="insurance">Póliza de Arrendamiento</MenuItem>
                      <MenuItem value="deposit">Depósito Adicional</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderLandlordData = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Datos del Arrendador</Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Complete sus datos como arrendador. Esta información será incluida en el contrato y es requerida por ley.
          </Typography>
        </Alert>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Nombre Completo"
              name="landlord_data.full_name"
              value={formik.values.landlord_data.full_name}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.full_name && Boolean(formik.errors.landlord_data?.full_name)}
              helperText={formik.touched.landlord_data?.full_name && formik.errors.landlord_data?.full_name}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Documento</InputLabel>
              <Select
                name="landlord_data.document_type"
                value={formik.values.landlord_data.document_type}
                onChange={formik.handleChange}
                disabled={readOnly}
              >
                <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                <MenuItem value="NIT">NIT</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Número de Documento"
              name="landlord_data.document_number"
              value={formik.values.landlord_data.document_number}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.document_number && Boolean(formik.errors.landlord_data?.document_number)}
              helperText={formik.touched.landlord_data?.document_number && formik.errors.landlord_data?.document_number}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Teléfono"
              name="landlord_data.phone"
              value={formik.values.landlord_data.phone}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.phone && Boolean(formik.errors.landlord_data?.phone)}
              helperText={formik.touched.landlord_data?.phone && formik.errors.landlord_data?.phone}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              name="landlord_data.email"
              type="email"
              value={formik.values.landlord_data.email}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.email && Boolean(formik.errors.landlord_data?.email)}
              helperText={formik.touched.landlord_data?.email && formik.errors.landlord_data?.email}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección de Residencia"
              name="landlord_data.address"
              value={formik.values.landlord_data.address}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.address && Boolean(formik.errors.landlord_data?.address)}
              helperText={formik.touched.landlord_data?.address && formik.errors.landlord_data?.address}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ciudad"
              name="landlord_data.city"
              value={formik.values.landlord_data.city}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.city && Boolean(formik.errors.landlord_data?.city)}
              helperText={formik.touched.landlord_data?.city && formik.errors.landlord_data?.city}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Contacto de Emergencia"
              name="landlord_data.emergency_contact"
              value={formik.values.landlord_data.emergency_contact}
              onChange={formik.handleChange}
              error={formik.touched.landlord_data?.emergency_contact && Boolean(formik.errors.landlord_data?.emergency_contact)}
              helperText={formik.touched.landlord_data?.emergency_contact && formik.errors.landlord_data?.emergency_contact}
              disabled={readOnly}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Cuenta Bancaria (Opcional)"
              name="landlord_data.bank_account"
              value={formik.values.landlord_data.bank_account}
              onChange={formik.handleChange}
              disabled={readOnly}
              helperText="Para recibir pagos del canon de arrendamiento"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderFinalReview = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <GavelIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Revisión Final del Contrato</Typography>
        </Box>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            ✅ Su contrato está completo y listo para enviar al arrendatario. Revise todos los datos antes de continuar.
          </Typography>
        </Alert>
        
        {/* Resumen Ejecutivo */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>📋 Resumen Ejecutivo</Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Propiedad:</strong> {formik.values.property_address}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Tipo:</strong> {formik.values.property_type}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Canon:</strong> {formatCurrency(formik.values.monthly_rent)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Duración:</strong> {formik.values.contract_duration_months} meses
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Arrendador:</strong> {formik.values.landlord_data.full_name}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Total Inicial:</strong> {formatCurrency(formik.values.monthly_rent + calculateTotalDeposits())}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
        
        {/* Validaciones Legales */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>⚖️ Validaciones Legales</Typography>
          <Box>
            {[
              { check: formik.values.security_deposit <= formik.values.monthly_rent * 2, text: 'Depósito no excede 2 meses de canon (Art. 15 Ley 820)' },
              { check: formik.values.contract_duration_months >= 12, text: 'Duración mínima de 12 meses (recomendado)' },
              { check: formik.values.landlord_data.full_name && formik.values.landlord_data.document_number, text: 'Datos completos del arrendador' },
              { check: formik.values.monthly_rent >= 100000, text: 'Canon dentro de rangos comerciales' },
            ].map((validation, index) => (
              <Box key={index} display="flex" alignItems="center" mb={1}>
                <CheckIcon color={validation.check ? 'success' : 'error'} sx={{ mr: 1 }} />
                <Typography variant="body2" color={validation.check ? 'success.main' : 'error.main'}>
                  {validation.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Próximos Pasos */}
        <Box>
          <Typography variant="h6" gutterBottom>🚀 Próximos Pasos</Typography>
          <Box pl={2}>
            <Typography variant="body2" gutterBottom>1. Haga clic en "Enviar Invitación al Arrendatario"</Typography>
            <Typography variant="body2" gutterBottom>2. El arrendatario recibirá un email con enlace seguro</Typography>
            <Typography variant="body2" gutterBottom>3. El arrendatario completará sus datos</Typography>
            <Typography variant="body2" gutterBottom>4. Ambas partes revisarán y firmarán digitalmente</Typography>
            <Typography variant="body2">5. El contrato adquiere vida jurídica al ser publicado</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderEconomicTerms();
      case 2:
        return renderPoliciesAndServices();
      case 3:
        return renderLandlordData();
      case 4:
        return renderFinalReview();
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              📄 Nuevo Contrato de Arrendamiento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema controlado por arrendador - Legislación colombiana (Ley 820 de 2003)
            </Typography>
          </Box>
          {isDirty && (
            <Chip
              label="Cambios sin guardar"
              color="warning"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        
        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 2 }}>
          {contractSteps.map((step, index) => (
            <Step key={step.label} completed={getStepCompletion(index)}>
              <StepLabel icon={step.icon}>
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Progress Bar */}
        <Box mt={2}>
          <LinearProgress
            variant="determinate"
            value={(activeStep / (contractSteps.length - 1)) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* Step Content */}
      <Box mb={3}>
        {renderStepContent(activeStep)}
      </Box>

      {/* Navigation Controls */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<EditIcon />}
          >
            Anterior
          </Button>
          
          <Box display="flex" gap={2}>
            <LoadingButton
              variant="outlined"
              onClick={() => formik.handleSubmit()}
              loading={isLoading}
              startIcon={<SaveIcon />}
              disabled={!isDirty}
            >
              Guardar Borrador
            </LoadingButton>
            
            {activeStep < contractSteps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!getStepCompletion(activeStep)}
                endIcon={<EditIcon />}
              >
                Siguiente
              </Button>
            ) : (
              <LoadingButton
                variant="contained"
                color="success"
                onClick={() => onSendInvitation(formik.values)}
                loading={isLoading}
                disabled={!getStepCompletion(4)}
                startIcon={<SendIcon />}
              >
                Enviar Invitación al Arrendatario
              </LoadingButton>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default LandlordContractTemplate;