/**
 * Formulario Completo de Datos del Arrendatario
 * Componente especializado para recopilar toda la información necesaria del arrendatario
 * Incluye referencias, historial laboral, mascotas, y validaciones colombianas
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Pets as PetsIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';

import {
  TenantData,
  PersonalReference,
  CommercialReference,
  PetDetails,
  HouseholdMember,
  PreviousRental,
  DocumentType,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';

interface TenantDataFormProps {
  initialData?: Partial<TenantData>;
  onSubmit: (data: TenantData) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
  showOptionalSections?: {
    pets?: boolean;
    references?: boolean;
    household?: boolean;
    previousRentals?: boolean;
  };
}

// Esquema de validación completo
const validationSchema = Yup.object({
  // Información personal básica
  full_name: Yup.string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .required('Nombre completo es requerido'),
  
  document_type: Yup.string()
    .oneOf(['CC', 'CE', 'NIT', 'PP'], 'Tipo de documento inválido')
    .required('Tipo de documento es requerido'),
  
  document_number: Yup.string()
    .matches(/^[0-9]+$/, 'Solo se permiten números')
    .min(6, 'Número de documento debe tener al menos 6 dígitos')
    .max(12, 'Número de documento no puede exceder 12 dígitos')
    .required('Número de documento es requerido'),
  
  phone: Yup.string()
    .matches(/^[0-9\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .required('Teléfono es requerido'),
  
  email: Yup.string()
    .email('Email inválido')
    .required('Email es requerido'),
  
  current_address: Yup.string()
    .min(10, 'Dirección debe ser más específica')
    .required('Dirección actual es requerida'),
  
  city: Yup.string()
    .min(2, 'Ciudad inválida')
    .required('Ciudad es requerida'),
  
  // Información laboral
  employment_type: Yup.string()
    .oneOf(['employee', 'independent', 'business_owner', 'retired', 'student', 'unemployed'])
    .required('Tipo de empleo es requerido'),
  
  monthly_income: Yup.number()
    .min(1, 'Ingresos mensuales deben ser mayor a 0')
    .required('Ingresos mensuales son requeridos'),
  
  // Contacto de emergencia
  emergency_contact: Yup.string()
    .min(3, 'Nombre de contacto de emergencia requerido')
    .required('Contacto de emergencia es requerido'),
  
  emergency_phone: Yup.string()
    .matches(/^[0-9\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .required('Teléfono de emergencia es requerido'),
  
  emergency_relationship: Yup.string()
    .min(2, 'Especifica el parentesco')
    .required('Parentesco es requerido'),
  
  // Referencias personales
  personal_references: Yup.array().of(
    Yup.object({
      name: Yup.string().min(3, 'Nombre inválido').required('Nombre requerido'),
      relationship: Yup.string().min(2, 'Especifica la relación').required('Relación requerida'),
      phone: Yup.string().matches(/^[0-9\s\-\+\(\)]+$/, 'Teléfono inválido').required('Teléfono requerido'),
      years_known: Yup.number().min(1, 'Mínimo 1 año').max(50, 'Máximo 50 años').required('Años de conocerse requerido'),
    })
  ).min(2, 'Se requieren al menos 2 referencias personales'),
  
  // Referencias comerciales
  commercial_references: Yup.array().of(
    Yup.object({
      institution_name: Yup.string().min(3, 'Nombre de institución inválido').required('Institución requerida'),
      phone: Yup.string().matches(/^[0-9\s\-\+\(\)]+$/, 'Teléfono inválido').required('Teléfono requerido'),
      relationship_duration_months: Yup.number().min(1, 'Mínimo 1 mes').required('Duración de relación requerida'),
    })
  ).min(1, 'Se requiere al menos 1 referencia comercial'),
});

export const TenantDataForm: React.FC<TenantDataFormProps> = ({
  initialData = {},
  onSubmit,
  loading = false,
  readOnly = false,
  showOptionalSections = {
    pets: true,
    references: true,
    household: true,
    previousRentals: true,
  },
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    employment: true,
    emergency: true,
    references: false,
    pets: false,
    household: false,
    previous: false,
  });

  const [referenceDialog, setReferenceDialog] = useState<{
    open: boolean;
    type: 'personal' | 'commercial';
    index?: number;
  }>({ open: false, type: 'personal' });

  const formik = useFormik<TenantData>({
    initialValues: {
      // Información básica
      full_name: initialData.full_name || '',
      document_type: (initialData.document_type as DocumentType) || 'CC',
      document_number: initialData.document_number || '',
      phone: initialData.phone || '',
      email: initialData.email || '',
      current_address: initialData.current_address || '',
      city: initialData.city || '',
      department: initialData.department || '',
      country: initialData.country || 'Colombia',
      
      // Información laboral
      employment_type: initialData.employment_type || 'employee',
      company_name: initialData.company_name || '',
      position: initialData.position || '',
      work_address: initialData.work_address || '',
      work_phone: initialData.work_phone || '',
      monthly_income: initialData.monthly_income || 0,
      additional_income: initialData.additional_income || 0,
      income_verification_documents: initialData.income_verification_documents || [],
      
      // Referencias
      personal_references: initialData.personal_references || [],
      commercial_references: initialData.commercial_references || [],
      
      // Emergencia
      emergency_contact: initialData.emergency_contact || '',
      emergency_phone: initialData.emergency_phone || '',
      emergency_relationship: initialData.emergency_relationship || '',
      
      // Mascotas
      has_pets: initialData.has_pets || false,
      pet_details: initialData.pet_details || [],
      
      // Información adicional
      household_members: initialData.household_members || [],
      previous_rental_history: initialData.previous_rental_history || [],
      special_needs: initialData.special_needs || '',
      additional_comments: initialData.additional_comments || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      await onSubmit(values);
    },
  });

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addPersonalReference = () => {
    const newReference: PersonalReference = {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      years_known: 1,
    };
    formik.setFieldValue('personal_references', [...formik.values.personal_references, newReference]);
  };

  const removePersonalReference = (index: number) => {
    const newReferences = formik.values.personal_references.filter((_, i) => i !== index);
    formik.setFieldValue('personal_references', newReferences);
  };

  const addCommercialReference = () => {
    const newReference: CommercialReference = {
      type: 'bank',
      institution_name: '',
      phone: '',
      relationship_duration_months: 6,
    };
    formik.setFieldValue('commercial_references', [...formik.values.commercial_references, newReference]);
  };

  const removeCommercialReference = (index: number) => {
    const newReferences = formik.values.commercial_references.filter((_, i) => i !== index);
    formik.setFieldValue('commercial_references', newReferences);
  };

  const addPet = () => {
    const newPet: PetDetails = {
      type: 'dog',
      name: '',
      age: 1,
      vaccinated: false,
    };
    formik.setFieldValue('pet_details', [...formik.values.pet_details, newPet]);
  };

  const removePet = (index: number) => {
    const newPets = formik.values.pet_details?.filter((_, i) => i !== index) || [];
    formik.setFieldValue('pet_details', newPets);
  };

  const addHouseholdMember = () => {
    const newMember: HouseholdMember = {
      name: '',
      relationship: '',
      age: 18,
    };
    formik.setFieldValue('household_members', [...(formik.values.household_members || []), newMember]);
  };

  const removeHouseholdMember = (index: number) => {
    const newMembers = formik.values.household_members?.filter((_, i) => i !== index) || [];
    formik.setFieldValue('household_members', newMembers);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <FormikProvider value={formik}>
      <Box component="form" onSubmit={formik.handleSubmit}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          📋 Información del Arrendatario
        </Typography>

        {/* Información Básica */}
        <Accordion 
          expanded={expandedSections.basic} 
          onChange={() => handleSectionToggle('basic')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Información Personal</Typography>
              {formik.errors.full_name || formik.errors.document_number || formik.errors.phone || formik.errors.email ? (
                <Chip label="Requerido" color="error" size="small" sx={{ ml: 2 }} />
              ) : (
                <Chip label="Completo" color="success" size="small" sx={{ ml: 2 }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  name="full_name"
                  value={formik.values.full_name}
                  onChange={formik.handleChange}
                  error={formik.touched.full_name && Boolean(formik.errors.full_name)}
                  helperText={formik.touched.full_name && formik.errors.full_name}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Documento</InputLabel>
                  <Select
                    name="document_type"
                    value={formik.values.document_type}
                    onChange={formik.handleChange}
                    disabled={readOnly}
                  >
                    <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                    <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                    <MenuItem value="NIT">NIT (Persona Jurídica)</MenuItem>
                    <MenuItem value="PP">Pasaporte</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Documento"
                  name="document_number"
                  value={formik.values.document_number}
                  onChange={formik.handleChange}
                  error={formik.touched.document_number && Boolean(formik.errors.document_number)}
                  helperText={formik.touched.document_number && formik.errors.document_number}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono Principal"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  error={formik.touched.phone && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                  placeholder="Ej: +57 300 123 4567"
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  name="city"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  error={formik.touched.city && Boolean(formik.errors.city)}
                  helperText={formik.touched.city && formik.errors.city}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección Actual"
                  name="current_address"
                  value={formik.values.current_address}
                  onChange={formik.handleChange}
                  error={formik.touched.current_address && Boolean(formik.errors.current_address)}
                  helperText={formik.touched.current_address && formik.errors.current_address}
                  placeholder="Dirección completa con barrio, ciudad"
                  disabled={readOnly}
                  required
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Información Laboral */}
        <Accordion 
          expanded={expandedSections.employment} 
          onChange={() => handleSectionToggle('employment')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Información Laboral</Typography>
              {formik.errors.employment_type || formik.errors.monthly_income ? (
                <Chip label="Requerido" color="error" size="small" sx={{ ml: 2 }} />
              ) : (
                <Chip label="Completo" color="success" size="small" sx={{ ml: 2 }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Empleo</InputLabel>
                  <Select
                    name="employment_type"
                    value={formik.values.employment_type}
                    onChange={formik.handleChange}
                    disabled={readOnly}
                  >
                    <MenuItem value="employee">Empleado</MenuItem>
                    <MenuItem value="independent">Trabajador Independiente</MenuItem>
                    <MenuItem value="business_owner">Empresario</MenuItem>
                    <MenuItem value="retired">Pensionado</MenuItem>
                    <MenuItem value="student">Estudiante</MenuItem>
                    <MenuItem value="unemployed">Desempleado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ingresos Mensuales"
                  name="monthly_income"
                  type="number"
                  value={formik.values.monthly_income}
                  onChange={formik.handleChange}
                  error={formik.touched.monthly_income && Boolean(formik.errors.monthly_income)}
                  helperText={
                    formik.touched.monthly_income && formik.errors.monthly_income 
                      ? formik.errors.monthly_income
                      : `Equivale a ${formatCurrency(formik.values.monthly_income)}`
                  }
                  InputProps={{
                    startAdornment: '$',
                  }}
                  disabled={readOnly}
                  required
                />
              </Grid>

              {formik.values.employment_type !== 'unemployed' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Empresa / Empleador"
                      name="company_name"
                      value={formik.values.company_name}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cargo / Posición"
                      name="position"
                      value={formik.values.position}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dirección del Trabajo"
                      name="work_address"
                      value={formik.values.work_address}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Teléfono del Trabajo"
                      name="work_phone"
                      value={formik.values.work_phone}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ingresos Adicionales"
                  name="additional_income"
                  type="number"
                  value={formik.values.additional_income}
                  onChange={formik.handleChange}
                  helperText="Otros ingresos (opcional)"
                  InputProps={{
                    startAdornment: '$',
                  }}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Contacto de Emergencia */}
        <Accordion 
          expanded={expandedSections.emergency} 
          onChange={() => handleSectionToggle('emergency')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <PhoneIcon sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6">Contacto de Emergencia</Typography>
              {formik.errors.emergency_contact || formik.errors.emergency_phone ? (
                <Chip label="Requerido" color="error" size="small" sx={{ ml: 2 }} />
              ) : (
                <Chip label="Completo" color="success" size="small" sx={{ ml: 2 }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nombre del Contacto"
                  name="emergency_contact"
                  value={formik.values.emergency_contact}
                  onChange={formik.handleChange}
                  error={formik.touched.emergency_contact && Boolean(formik.errors.emergency_contact)}
                  helperText={formik.touched.emergency_contact && formik.errors.emergency_contact}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Teléfono de Emergencia"
                  name="emergency_phone"
                  value={formik.values.emergency_phone}
                  onChange={formik.handleChange}
                  error={formik.touched.emergency_phone && Boolean(formik.errors.emergency_phone)}
                  helperText={formik.touched.emergency_phone && formik.errors.emergency_phone}
                  disabled={readOnly}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Parentesco / Relación"
                  name="emergency_relationship"
                  value={formik.values.emergency_relationship}
                  onChange={formik.handleChange}
                  error={formik.touched.emergency_relationship && Boolean(formik.errors.emergency_relationship)}
                  helperText={formik.touched.emergency_relationship && formik.errors.emergency_relationship}
                  placeholder="Ej: Hermano, Padre, Amigo"
                  disabled={readOnly}
                  required
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Referencias */}
        {showOptionalSections.references && (
          <Accordion 
            expanded={expandedSections.references} 
            onChange={() => handleSectionToggle('references')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center">
                <BusinessIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Referencias</Typography>
                <Chip 
                  label={`${formik.values.personal_references.length} Personales, ${formik.values.commercial_references.length} Comerciales`} 
                  size="small" 
                  sx={{ ml: 2 }} 
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Referencias Personales */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      👥 Referencias Personales
                    </Typography>
                    {!readOnly && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addPersonalReference}
                      >
                        Agregar
                      </Button>
                    )}
                  </Box>
                  
                  {formik.values.personal_references.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Relación</TableCell>
                            <TableCell>Teléfono</TableCell>
                            <TableCell>Años</TableCell>
                            {!readOnly && <TableCell>Acciones</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.personal_references.map((ref, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={ref.name}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.personal_references];
                                    newRefs[index] = { ...newRefs[index], name: e.target.value };
                                    formik.setFieldValue('personal_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={ref.relationship}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.personal_references];
                                    newRefs[index] = { ...newRefs[index], relationship: e.target.value };
                                    formik.setFieldValue('personal_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={ref.phone}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.personal_references];
                                    newRefs[index] = { ...newRefs[index], phone: e.target.value };
                                    formik.setFieldValue('personal_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={ref.years_known}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.personal_references];
                                    newRefs[index] = { ...newRefs[index], years_known: parseInt(e.target.value) || 0 };
                                    formik.setFieldValue('personal_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              {!readOnly && (
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => removePersonalReference(index)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      No hay referencias personales agregadas. Se recomiendan al menos 2.
                    </Alert>
                  )}
                </Grid>

                {/* Referencias Comerciales */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      🏢 Referencias Comerciales
                    </Typography>
                    {!readOnly && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addCommercialReference}
                      >
                        Agregar
                      </Button>
                    )}
                  </Box>
                  
                  {formik.values.commercial_references.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Institución</TableCell>
                            <TableCell>Teléfono</TableCell>
                            <TableCell>Meses</TableCell>
                            {!readOnly && <TableCell>Acciones</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.commercial_references.map((ref, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={ref.type}
                                    onChange={(e) => {
                                      const newRefs = [...formik.values.commercial_references];
                                      newRefs[index] = { ...newRefs[index], type: e.target.value as any };
                                      formik.setFieldValue('commercial_references', newRefs);
                                    }}
                                    disabled={readOnly}
                                  >
                                    <MenuItem value="bank">Banco</MenuItem>
                                    <MenuItem value="credit_card">Tarjeta</MenuItem>
                                    <MenuItem value="store">Tienda</MenuItem>
                                    <MenuItem value="previous_landlord">Arrendador</MenuItem>
                                    <MenuItem value="employer">Empleador</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={ref.institution_name}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.commercial_references];
                                    newRefs[index] = { ...newRefs[index], institution_name: e.target.value };
                                    formik.setFieldValue('commercial_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={ref.phone}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.commercial_references];
                                    newRefs[index] = { ...newRefs[index], phone: e.target.value };
                                    formik.setFieldValue('commercial_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={ref.relationship_duration_months}
                                  onChange={(e) => {
                                    const newRefs = [...formik.values.commercial_references];
                                    newRefs[index] = { ...newRefs[index], relationship_duration_months: parseInt(e.target.value) || 0 };
                                    formik.setFieldValue('commercial_references', newRefs);
                                  }}
                                  disabled={readOnly}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              {!readOnly && (
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => removeCommercialReference(index)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      No hay referencias comerciales agregadas. Se recomienda al menos 1.
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Mascotas */}
        {showOptionalSections.pets && (
          <Accordion 
            expanded={expandedSections.pets} 
            onChange={() => handleSectionToggle('pets')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center">
                <PetsIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Mascotas</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="has_pets"
                      checked={formik.values.has_pets}
                      onChange={formik.handleChange}
                      disabled={readOnly}
                    />
                  }
                  label="Tengo mascotas"
                  sx={{ ml: 2 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {formik.values.has_pets ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        🐾 Detalles de Mascotas
                      </Typography>
                      {!readOnly && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addPet}
                        >
                          Agregar Mascota
                        </Button>
                      )}
                    </Box>
                    
                    {formik.values.pet_details?.map((pet, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Tipo</InputLabel>
                                <Select
                                  value={pet.type}
                                  onChange={(e) => {
                                    const newPets = [...(formik.values.pet_details || [])];
                                    newPets[index] = { ...newPets[index], type: e.target.value as any };
                                    formik.setFieldValue('pet_details', newPets);
                                  }}
                                  disabled={readOnly}
                                >
                                  <MenuItem value="dog">Perro</MenuItem>
                                  <MenuItem value="cat">Gato</MenuItem>
                                  <MenuItem value="bird">Ave</MenuItem>
                                  <MenuItem value="fish">Pez</MenuItem>
                                  <MenuItem value="other">Otro</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Nombre"
                                value={pet.name}
                                onChange={(e) => {
                                  const newPets = [...(formik.values.pet_details || [])];
                                  newPets[index] = { ...newPets[index], name: e.target.value };
                                  formik.setFieldValue('pet_details', newPets);
                                }}
                                disabled={readOnly}
                              />
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Edad"
                                type="number"
                                value={pet.age}
                                onChange={(e) => {
                                  const newPets = [...(formik.values.pet_details || [])];
                                  newPets[index] = { ...newPets[index], age: parseInt(e.target.value) || 0 };
                                  formik.setFieldValue('pet_details', newPets);
                                }}
                                disabled={readOnly}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={pet.vaccinated}
                                    onChange={(e) => {
                                      const newPets = [...(formik.values.pet_details || [])];
                                      newPets[index] = { ...newPets[index], vaccinated: e.target.checked };
                                      formik.setFieldValue('pet_details', newPets);
                                    }}
                                    disabled={readOnly}
                                  />
                                }
                                label="Vacunado"
                              />
                            </Grid>
                            {!readOnly && (
                              <Grid item xs={12} md={1}>
                                <IconButton
                                  onClick={() => removePet(index)}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">
                  Si no tienes mascotas, puedes omitir esta sección.
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Comentarios adicionales */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              💬 Información Adicional
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Necesidades Especiales"
                  name="special_needs"
                  value={formik.values.special_needs}
                  onChange={formik.handleChange}
                  placeholder="Cualquier consideración especial que deba conocer el arrendador"
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Comentarios Adicionales"
                  name="additional_comments"
                  value={formik.values.additional_comments}
                  onChange={formik.handleChange}
                  placeholder="Información adicional que consideres relevante"
                  disabled={readOnly}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        {!readOnly && (
          <Box display="flex" gap={2} justifyContent="center" sx={{ mt: 4 }}>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={loading}
              size="large"
              sx={{ minWidth: 200 }}
            >
              Guardar Información
            </LoadingButton>
          </Box>
        )}

        {/* Resumen de completitud */}
        <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
              📊 Resumen de Completitud
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {formik.values.personal_references.length}
                  </Typography>
                  <Typography variant="caption">Referencias Personales</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    {formik.values.commercial_references.length}
                  </Typography>
                  <Typography variant="caption">Referencias Comerciales</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info">
                    {formik.values.pet_details?.length || 0}
                  </Typography>
                  <Typography variant="caption">Mascotas</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success">
                    {formatCurrency(formik.values.monthly_income)}
                  </Typography>
                  <Typography variant="caption">Ingresos Mensuales</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </FormikProvider>
  );
};

export default TenantDataForm;