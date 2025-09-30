/**
 * ProfessionalContractForm - Advanced contract creation with professional templates
 * Features: Template selection, auto-generation, legal clauses, Colombian compliance
 * Based on international contract standards and Colombian law
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tooltip,
} from '@mui/material';
import {
  Assignment as ContractIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Gavel as LegalIcon,
  Home as PropertyIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AutoAwesome as TemplateIcon,
  Language as LanguageIcon,
  BusinessCenter as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { Contract, CreateContractDto } from '../../types/contract';
import { format, addMonths, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Professional contract templates based on Colombian law
const CONTRACT_TEMPLATES = {
  rental_urban: {
    title: 'Contrato de Arrendamiento de Vivienda Urbana',
    description: 'Contrato estándar para vivienda urbana según Ley 820 de 2003',
    icon: <PropertyIcon />,
    color: 'primary',
    clauses: [
      'Objeto del contrato y destinación del inmueble',
      'Canon de arrendamiento y forma de pago',
      'Duración del contrato',
      'Depósito de garantía',
      'Obligaciones del arrendador',
      'Obligaciones del arrendatario',
      'Causales de terminación',
      'Cláusula de permanencia',
      'Servicios públicos',
      'Reformas y mejoras',
    ],
    template: `CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA

Entre los suscritos a saber: {ARRENDADOR_NOMBRE}, mayor de edad, vecino de {CIUDAD}, identificado(a) con cédula de ciudadanía No. {ARRENDADOR_CC}, quien en adelante se denominará EL ARRENDADOR, y {ARRENDATARIO_NOMBRE}, mayor de edad, vecino de {CIUDAD}, identificado(a) con cédula de ciudadanía No. {ARRENDATARIO_CC}, quien en adelante se denominará EL ARRENDATARIO, hemos convenido celebrar el presente CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA, que se regirá por las siguientes cláusulas:

PRIMERA. OBJETO DEL CONTRATO: EL ARRENDADOR da en arrendamiento al ARRENDATARIO el inmueble ubicado en {DIRECCION_INMUEBLE}, con un área aproximada de {AREA_M2} metros cuadrados, para destinarlo exclusivamente a VIVIENDA FAMILIAR.

SEGUNDA. CANON DE ARRENDAMIENTO: El canon mensual de arrendamiento es de {{CANON_MENSUAL}} pesos colombianos, que deberá ser cancelado dentro de los primeros cinco (5) días de cada mes, en la cuenta {DATOS_PAGO}.

TERCERA. DURACIÓN: El presente contrato tendrá una duración de {DURACION_MESES} meses, contados a partir del {FECHA_INICIO} hasta el {FECHA_FIN}.

CUARTA. DEPÓSITO DE GARANTÍA: EL ARRENDATARIO constituye como garantía del cumplimiento de las obligaciones derivadas del presente contrato, la suma de {{DEPOSITO}} pesos colombianos, equivalente a {MESES_DEPOSITO} mes(es) de arrendamiento.

QUINTA. OBLIGACIONES DEL ARRENDADOR:
a) Entregar el inmueble en las condiciones de higiene y seguridad que permitan su uso y goce.
b) Mantener en el inmueble los servicios públicos domiciliarios.
c) Realizar las reparaciones necesarias para conservar el inmueble en estado de servir para el fin arrendado.

SEXTA. OBLIGACIONES DEL ARRENDATARIO:
a) Pagar puntualmente el canon de arrendamiento.
b) Usar el inmueble únicamente para vivienda familiar.
c) Conservar el inmueble en las mismas condiciones de higiene y seguridad en que lo recibió.
d) Permitir las inspecciones que EL ARRENDADOR solicite.

SÉPTIMA. SERVICIOS PÚBLICOS: Los servicios públicos domiciliarios estarán a cargo de {SERVICIOS_CARGO}.

OCTAVA. TERMINACIÓN: El presente contrato terminará por las causales establecidas en la Ley 820 de 2003 y el Código Civil.

En constancia de lo anterior, se firma en {CIUDAD_FIRMA}, el {FECHA_FIRMA}.

_______________________                    _______________________
EL ARRENDADOR                              EL ARRENDATARIO
{ARRENDADOR_NOMBRE}                        {ARRENDATARIO_NOMBRE}
C.C. {ARRENDADOR_CC}                       C.C. {ARRENDATARIO_CC}`
  },
  rental_commercial: {
    title: 'Contrato de Arrendamiento de Local Comercial',
    description: 'Contrato para locales comerciales y oficinas',
    icon: <BusinessIcon />,
    color: 'secondary',
    clauses: [
      'Objeto y destinación comercial',
      'Canon comercial y incrementos',
      'Duración y renovación automática',
      'Garantías comerciales',
      'Obligaciones específicas comerciales',
      'Uso de marca y publicidad',
      'Adecuaciones y mejoras',
      'Administración y gastos comunes',
    ],
    template: `CONTRATO DE ARRENDAMIENTO DE LOCAL COMERCIAL

[Plantilla comercial profesional aquí...]`
  },
  rental_room: {
    title: 'Contrato de Arrendamiento de Habitación',
    description: 'Contrato para habitaciones individuales o compartidas',
    icon: <PersonIcon />,
    color: 'info',
    clauses: [
      'Habitación y espacios comunes',
      'Servicios incluidos',
      'Normas de convivencia',
      'Horarios y restricciones',
      'Uso de cocina y baños',
      'Huéspedes y visitantes',
    ],
    template: `CONTRATO DE ARRENDAMIENTO DE HABITACIÓN

[Plantilla de habitación profesional aquí...]`
  },
  service_provider: {
    title: 'Contrato de Prestación de Servicios',
    description: 'Para proveedores de servicios inmobiliarios',
    icon: <BusinessIcon />,
    color: 'warning',
    clauses: [
      'Servicios a prestar',
      'Honorarios y forma de pago',
      'Cronograma de actividades',
      'Obligaciones del prestador',
      'Confidencialidad',
      'Propiedad intelectual',
    ],
    template: `CONTRATO DE PRESTACIÓN DE SERVICIOS INMOBILIARIOS

[Plantilla de servicios profesional aquí...]`
  }
};

const LEGAL_CLAUSES = {
  colombia: [
    'Ley 820 de 2003 - Régimen de arrendamiento de vivienda urbana',
    'Código Civil Colombiano',
    'Ley 142 de 1994 - Servicios públicos domiciliarios',
    'Decreto 2060 de 2004 - Vivienda de interés social',
  ]
};

interface ProfessionalContractFormProps {
  contract?: Contract;
  isEdit?: boolean;
  propertyId?: string;
  tenantId?: string;
}

export const ProfessionalContractForm: React.FC<ProfessionalContractFormProps> = ({
  contract,
  isEdit = false,
  propertyId,
  tenantId
}) => {
  const navigate = useNavigate();
  const { createContract, updateContract } = useContracts();
  
  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('rental_urban');
  const [previewMode, setPreviewMode] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);
  
  const [formData, setFormData] = useState<CreateContractDto>({
    contract_type: 'rental_urban',
    secondary_party: tenantId || '',
    title: '',
    description: '',
    content: '',
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    security_deposit: 0,
    property: propertyId || '',
    is_renewable: true,
  });

  // Additional professional fields
  const [professionalData, setProfessionalData] = useState({
    landlord_name: '',
    landlord_id: '',
    tenant_name: '',
    tenant_id: '',
    property_address: '',
    property_area: '',
    city: 'Medellín',
    payment_method: 'bank_transfer',
    services_included: [] as string[],
    special_clauses: [] as string[],
    witnesses: [] as Array<{name: string, id: string}>,
    legal_framework: 'colombia',
    language: 'es',
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const steps = [
    'Información Básica',
    'Partes del Contrato', 
    'Detalles del Inmueble',
    'Condiciones Económicas',
    'Cláusulas Legales',
    'Revisión y Firma'
  ];

  // Separate effect for template changes to avoid infinite loop
  useEffect(() => {
    if (autoGenerate && selectedTemplate) {
      generateContractContent();
    }
  }, [selectedTemplate, professionalData, autoGenerate]); // Removed formData from dependencies

  const generateContractContent = () => {
    const template = CONTRACT_TEMPLATES[selectedTemplate as keyof typeof CONTRACT_TEMPLATES];
    if (!template) return;

    let content = template.template;
    
    // Replace placeholders with actual data
    const replacements = {
      '{ARRENDADOR_NOMBRE}': professionalData.landlord_name || '[NOMBRE ARRENDADOR]',
      '{ARRENDADOR_CC}': professionalData.landlord_id || '[CÉDULA ARRENDADOR]',
      '{ARRENDATARIO_NOMBRE}': professionalData.tenant_name || '[NOMBRE ARRENDATARIO]',
      '{ARRENDATARIO_CC}': professionalData.tenant_id || '[CÉDULA ARRENDATARIO]',
      '{CIUDAD}': professionalData.city,
      '{DIRECCION_INMUEBLE}': professionalData.property_address || '[DIRECCIÓN DEL INMUEBLE]',
      '{AREA_M2}': professionalData.property_area || '[ÁREA]',
      '{{CANON_MENSUAL}}': formData.monthly_rent.toLocaleString('es-CO'),
      '{{DEPOSITO}}': formData.security_deposit.toLocaleString('es-CO'),
      '{DURACION_MESES}': formData.start_date && formData.end_date ? 
        differenceInMonths(new Date(formData.end_date), new Date(formData.start_date)) : '[DURACIÓN]',
      '{FECHA_INICIO}': formData.start_date ? format(new Date(formData.start_date), 'dd/MM/yyyy', { locale: es }) : '[FECHA INICIO]',
      '{FECHA_FIN}': formData.end_date ? format(new Date(formData.end_date), 'dd/MM/yyyy', { locale: es }) : '[FECHA FIN]',
      '{MESES_DEPOSITO}': Math.round(formData.security_deposit / (formData.monthly_rent || 1)),
      '{SERVICIOS_CARGO}': professionalData.services_included.length > 0 ? 'EL ARRENDATARIO' : 'EL ARRENDADOR',
      '{DATOS_PAGO}': '[DATOS DE PAGO]',
      '{CIUDAD_FIRMA}': professionalData.city,
      '{FECHA_FIRMA}': format(new Date(), 'dd/MM/yyyy', { locale: es }),
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      // Escape special regex characters in placeholder
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(escapedPlaceholder, 'g'), String(value));
    });

    setFormData(prev => ({
      ...prev,
      content,
      title: template.title,
      description: template.description
    }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.title) errors.push('El título es requerido');
    if (!formData.secondary_party) errors.push('El inquilino/contraparte es requerido');
    if (!formData.start_date) errors.push('La fecha de inicio es requerida');
    if (!formData.end_date) errors.push('La fecha de fin es requerida');
    if (formData.monthly_rent <= 0) errors.push('El canon mensual debe ser mayor a 0');
    if (!formData.content) errors.push('El contenido del contrato es requerido');
    
    // Professional validations
    if (!professionalData.landlord_name) errors.push('El nombre del arrendador es requerido');
    if (!professionalData.tenant_name) errors.push('El nombre del arrendatario es requerido');
    if (!professionalData.property_address) errors.push('La dirección del inmueble es requerida');
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const contractData = {
        ...formData,
        metadata: {
          professional_data: professionalData,
          template_used: selectedTemplate,
          generated_at: new Date().toISOString(),
          version: '1.0'
        }
      };

      if (isEdit && contract) {
        await updateContract.mutateAsync({ id: contract.id, data: contractData });
      } else {
        await createContract.mutateAsync(contractData);
      }
      navigate('/app/contracts');
    } catch (error) {
      console.error('Error al guardar el contrato:', error);
    }
  };

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Selecciona el tipo de contrato
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(CONTRACT_TEMPLATES).map(([key, template]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedTemplate === key ? 2 : 1,
                        borderColor: selectedTemplate === key ? 'primary.main' : 'divider',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                      onClick={() => setSelectedTemplate(key)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Box color={`${template.color}.main`} mr={1}>
                            {template.icon}
                          </Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {template.title}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                        <Box mt={2}>
                          <Typography variant="caption" color="text.secondary">
                            Incluye {template.clauses.length} cláusulas estándar
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Arrendador"
                value={professionalData.landlord_name}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, landlord_name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cédula del Arrendador"
                value={professionalData.landlord_id}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, landlord_id: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Arrendatario"
                value={professionalData.tenant_name}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, tenant_name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cédula del Arrendatario"
                value={professionalData.tenant_id}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, tenant_id: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID de Usuario Inquilino (Sistema)"
                name="secondary_party"
                value={formData.secondary_party}
                onChange={(e) => setFormData(prev => ({ ...prev, secondary_party: e.target.value }))}
                required
                helperText="UUID del usuario en el sistema"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección del Inmueble"
                value={professionalData.property_address}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, property_address: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Área (m²)"
                value={professionalData.property_area}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, property_area: e.target.value }))}
                type="number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={professionalData.city}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID de Propiedad (Sistema)"
                name="property"
                value={formData.property}
                onChange={(e) => setFormData(prev => ({ ...prev, property: e.target.value }))}
                helperText="UUID de la propiedad en el sistema"
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Canon Mensual"
                name="monthly_rent"
                type="number"
                value={formData.monthly_rent}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: Number(e.target.value) }))}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Pesos colombianos"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Depósito de Garantía"
                name="security_deposit"
                type="number"
                value={formData.security_deposit}
                onChange={(e) => setFormData(prev => ({ ...prev, security_deposit: Number(e.target.value) }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Generalmente 1-2 meses de canon"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Inicio"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Fin"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoGenerate}
                    onChange={(e) => setAutoGenerate(e.target.checked)}
                  />
                }
                label="Generación automática de contenido"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contenido del Contrato"
                name="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                multiline
                rows={12}
                required
                helperText="Contenido legal completo del contrato"
              />
            </Grid>
          </Grid>
        );

      case 5:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Revisión Final del Contrato
                </Typography>
                <Typography>
                  Revisa todos los datos antes de crear el contrato. Una vez creado, podrás generar el PDF y proceder con las firmas digitales.
                </Typography>
              </Alert>
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
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Resumen del Contrato
                </Typography>
                <Typography><strong>Tipo:</strong> {CONTRACT_TEMPLATES[selectedTemplate as keyof typeof CONTRACT_TEMPLATES]?.title}</Typography>
                <Typography><strong>Arrendador:</strong> {professionalData.landlord_name}</Typography>
                <Typography><strong>Arrendatario:</strong> {professionalData.tenant_name}</Typography>
                <Typography><strong>Canon:</strong> ${formData.monthly_rent.toLocaleString('es-CO')}</Typography>
                <Typography><strong>Duración:</strong> {formData.start_date && formData.end_date ? 
                  `${differenceInMonths(new Date(formData.end_date), new Date(formData.start_date))} meses` : 'No definida'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <ContractIcon color="primary" />
              <Typography variant="h5">
                {isEdit ? 'Editar Contrato Profesional' : 'Nuevo Contrato Profesional'}
              </Typography>
            </Box>
          }
          action={
            <Box display="flex" gap={1}>
              <Tooltip title="Vista previa">
                <IconButton onClick={() => setPreviewMode(!previewMode)}>
                  <PreviewIcon />
                </IconButton>
              </Tooltip>
              <Chip
                label={CONTRACT_TEMPLATES[selectedTemplate as keyof typeof CONTRACT_TEMPLATES]?.title}
                color="primary"
                variant="outlined"
              />
            </Box>
          }
        />
        
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {renderStepContent(index)}
                  <Box sx={{ mb: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      sx={{ mr: 1 }}
                      disabled={createContract.isPending || updateContract.isPending}
                    >
                      {index === steps.length - 1 ? 'Crear Contrato' : 'Continuar'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                    >
                      Atrás
                    </Button>
                    <Button
                      onClick={() => navigate('/app/contracts')}
                      color="inherit"
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
          Vista Previa del Contrato
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {formData.content || 'El contenido se generará automáticamente...'}
            </Typography>
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

export default ProfessionalContractForm;