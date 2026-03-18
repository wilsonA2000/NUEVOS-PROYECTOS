import React, { useState, useEffect } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Chip,
  InputAdornment,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  SaveAs as SaveIcon,
  Preview as PreviewIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Gavel as LegalIcon,
  Restore as RestoreIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  CreateContractPayload,
  DocumentType,
  PropertyType,
} from '../../types/landlordContract';

interface ContractDraftEditorProps {
  contractId: string;
  onSave?: (updatedContract: LandlordControlledContractData) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

interface EditableContractData {
  // Landlord data
  landlord_full_name: string;
  landlord_document_type: string;
  landlord_document_number: string;
  landlord_document_expedition_date: string;
  landlord_document_expedition_place: string;
  landlord_phone: string;
  landlord_email: string;
  landlord_address: string;
  landlord_city: string;

  // Property data
  property_id: string;
  property_address: string;
  property_area: number;
  property_type: string;
  property_furnished: boolean;

  // Economic terms
  monthly_rent: number;
  security_deposit: number;
  contract_duration_months: number;
  utilities_included: boolean;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  payment_day: number;

  // Contract terms - Políticas
  guests_policy: 'unlimited' | 'limited' | 'prohibited';
  max_occupants: number;
  rent_increase_type: 'ipc' | 'fixed' | 'negotiable';

  // Contract template and clauses
  contract_template: string;
  special_clauses: string[];

  // Guarantee system (3 options)
  guarantee_type: 'none' | 'codeudor_salario' | 'codeudor_finca_raiz';
  codeudor_full_name: string;
  codeudor_document_type: 'CC' | 'CE' | 'TI' | 'NIT';
  codeudor_document_number: string;
  codeudor_phone: string;
  codeudor_email: string;
  codeudor_address: string;
  codeudor_city: string;
  codeudor_employer: string;
  codeudor_position: string;
  codeudor_monthly_income: number;
  codeudor_work_phone: string;
  codeudor_occupation: string;
  // Real estate guarantee fields
  property_matricula: string;
  property_address_guarantee: string;
  property_predial_number: string;
  property_catastral_number: string;
  property_linderos: string;
  property_area_guarantee: number;
  property_department_guarantee: string;
  property_city_guarantee: string;
  requires_biometric_codeudor: boolean;
}

export const ContractDraftEditor: React.FC<ContractDraftEditorProps> = ({
  contractId,
  onSave,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setIsSaving] = useState(false);
  const [contract, setContract] = useState<LandlordControlledContractData | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Editable contract data state
  const [contractData, setContractData] = useState<EditableContractData>({
    landlord_full_name: '',
    landlord_document_type: 'CC',
    landlord_document_number: '',
    landlord_document_expedition_date: '',
    landlord_document_expedition_place: '',
    landlord_phone: '',
    landlord_email: '',
    landlord_address: '',
    landlord_city: '',
    property_id: '',
    property_address: '',
    property_area: 0,
    property_type: 'apartment',
    property_furnished: false,
    monthly_rent: 0,
    security_deposit: 0,
    contract_duration_months: 12,
    utilities_included: false,
    pets_allowed: false,
    smoking_allowed: false,
    payment_day: 5,
    guests_policy: 'unlimited',
    max_occupants: 4,
    rent_increase_type: 'ipc',
    contract_template: 'rental_urban',
    special_clauses: [],
    guarantee_type: 'none',
    codeudor_full_name: '',
    codeudor_document_type: 'CC',
    codeudor_document_number: '',
    codeudor_phone: '',
    codeudor_email: '',
    codeudor_address: '',
    codeudor_city: '',
    codeudor_employer: '',
    codeudor_position: '',
    codeudor_monthly_income: 0,
    codeudor_work_phone: '',
    codeudor_occupation: '',
    property_matricula: '',
    property_address_guarantee: '',
    property_predial_number: '',
    property_catastral_number: '',
    property_linderos: '',
    property_area_guarantee: 0,
    property_department_guarantee: '',
    property_city_guarantee: '',
    requires_biometric_codeudor: false,
  });

  // Original data for comparison
  const [originalData, setOriginalData] = useState<EditableContractData | null>(null);

  const steps = [
    'Información del Arrendador',
    'Detalles de la Propiedad',
    'Condiciones Económicas',
    'Términos del Contrato',
    'Garantías del Contrato',
    'Cláusulas Especiales',
    'Revisión y Actualización',
  ];

  // Load contract data on component mount
  useEffect(() => {
    loadContractData();
  }, [contractId]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return undefined;

    const autoSaveTimer = setInterval(async () => {
      if (hasChanges && !saving) {
        await handleSave(false); // Auto-save without showing success message
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveTimer);
  }, [hasChanges, saving]);

  const loadContractData = async () => {
    try {
      setLoading(true);
      const contractResponse = await LandlordContractService.getContractForEditing(contractId);
      
      if (contractResponse) {
        setContract(contractResponse);
        
        // Map contract data to editable format
        const editableData = mapContractToEditableData(contractResponse);
        setContractData(editableData);
        setOriginalData({ ...editableData }); // Deep copy for comparison
      }
    } catch (error) {
      setValidationErrors(['Error al cargar el contrato. Inténtelo nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const mapContractToEditableData = (contract: LandlordControlledContractData): EditableContractData => {
    // Extract data from contract and map to editable format
    const landlordData = contract.landlord_data;
    // Extract contract_terms (puede contener guests_policy, guarantee_type, codeudor_data)
    const contractTerms = (contract as any).contract_terms || {};
    const codeudorData = contractTerms.codeudor_data || {};

    return {
      // Landlord data
      landlord_full_name: landlordData.full_name || '',
      landlord_document_type: landlordData.document_type || 'CC',
      landlord_document_number: landlordData.document_number || '',
      landlord_document_expedition_date: landlordData.document_expedition_date || '',
      landlord_document_expedition_place: landlordData.document_expedition_place || '',
      landlord_phone: landlordData.phone || '',
      landlord_email: landlordData.email || '',
      landlord_address: landlordData.address || '',
      landlord_city: landlordData.city || '',

      // Property data
      property_id: contract.property_id || '',
      property_address: contract.property_address || '',
      property_area: contract.property_area || 0,
      property_type: contract.property_type || 'apartamento',
      property_furnished: contract.property_furnished || false,

      // Economic terms
      monthly_rent: contract.monthly_rent || 0,
      security_deposit: contract.security_deposit || 0,
      contract_duration_months: contract.contract_duration_months || 12,
      utilities_included: contract.utilities_included || false,
      pets_allowed: contract.pets_allowed || false,
      smoking_allowed: contract.smoking_allowed || false,
      payment_day: contract.payment_day || 5,

      // Contract terms - Políticas (leer de contract_terms o valores por defecto)
      guests_policy: contractTerms.guests_policy || (contract as any).guests_policy || 'unlimited',
      max_occupants: contractTerms.max_occupants || (contract as any).max_occupants || 4,
      rent_increase_type: contractTerms.rent_increase_type || (contract as any).rent_increase_type || 'ipc',

      // Contract template and clauses
      contract_template: 'rental_urban', // Default template
      special_clauses: contract.special_clauses || [],

      // Guarantee system - leer de contract_terms
      guarantee_type: contractTerms.guarantee_type || 'none',
      codeudor_full_name: codeudorData.codeudor_full_name || '',
      codeudor_document_type: codeudorData.codeudor_document_type || 'CC',
      codeudor_document_number: codeudorData.codeudor_document_number || '',
      codeudor_phone: codeudorData.codeudor_phone || '',
      codeudor_email: codeudorData.codeudor_email || '',
      codeudor_address: codeudorData.codeudor_address || '',
      codeudor_city: codeudorData.codeudor_city || '',
      codeudor_employer: codeudorData.codeudor_employer || '',
      codeudor_position: codeudorData.codeudor_position || '',
      codeudor_monthly_income: codeudorData.codeudor_monthly_income || 0,
      codeudor_work_phone: codeudorData.codeudor_work_phone || '',
      codeudor_occupation: codeudorData.codeudor_occupation || '',
      // Real estate guarantee fields - leer de codeudor_data
      property_matricula: codeudorData.property_matricula || '',
      property_address_guarantee: codeudorData.property_address_guarantee || '',
      property_predial_number: codeudorData.property_predial_number || '',
      property_catastral_number: codeudorData.property_catastral_number || '',
      property_linderos: codeudorData.property_linderos || '',
      property_area_guarantee: codeudorData.property_area_guarantee || 0,
      property_department_guarantee: codeudorData.property_department_guarantee || '',
      property_city_guarantee: codeudorData.property_city_guarantee || '',
      requires_biometric_codeudor: contractTerms.requires_biometric_codeudor || false,
    };
  };

  const handleFieldChange = (field: keyof EditableContractData, value: any) => {
    setContractData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async (showMessage: boolean = true) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);

      // Validate current step
      if (!validateCurrentStep()) {
        return;
      }

      // Prepare update payload - matching LandlordControlledContractData structure
      const updatePayload: Partial<LandlordControlledContractData> & { contract_terms?: any } = {
        // Landlord data
        landlord_data: {
          full_name: contractData.landlord_full_name,
          document_type: contractData.landlord_document_type as DocumentType,
          document_number: contractData.landlord_document_number,
          document_expedition_date: contractData.landlord_document_expedition_date,
          document_expedition_place: contractData.landlord_document_expedition_place,
          phone: contractData.landlord_phone,
          email: contractData.landlord_email,
          address: contractData.landlord_address,
          city: contractData.landlord_city,
          emergency_contact: '', // Required field - using empty string as default
        },
        // Property data
        property_id: contractData.property_id,
        property_address: contractData.property_address,
        property_area: contractData.property_area,
        property_type: contractData.property_type as PropertyType,
        property_furnished: contractData.property_furnished,
        property_stratum: 3, // Default value - should be made editable
        // Economic terms
        monthly_rent: contractData.monthly_rent,
        security_deposit: contractData.security_deposit,
        contract_duration_months: contractData.contract_duration_months,
        utilities_included: contractData.utilities_included,
        pets_allowed: contractData.pets_allowed,
        smoking_allowed: contractData.smoking_allowed,
        payment_day: contractData.payment_day,
        // Contract clauses
        special_clauses: contractData.special_clauses,
        // Required fields for the type
        current_state: contract?.current_state || 'DRAFT',
        rent_increase_type: contractData.rent_increase_type as any,
        guests_policy: contractData.guests_policy as any,
        max_occupants: contractData.max_occupants,
        guarantor_required: contractData.guarantee_type !== 'none',
        // Contract terms con garantías, políticas y codeudor
        contract_terms: {
          // Políticas del contrato
          guests_policy: contractData.guests_policy,
          max_occupants: contractData.max_occupants,
          rent_increase_type: contractData.rent_increase_type,
          // Garantías
          guarantee_type: contractData.guarantee_type,
          guarantor_required: contractData.guarantee_type !== 'none',
          // Datos del codeudor si aplica
          ...(contractData.guarantee_type !== 'none' && {
            codeudor_data: {
              codeudor_full_name: contractData.codeudor_full_name,
              codeudor_document_type: contractData.codeudor_document_type,
              codeudor_document_number: contractData.codeudor_document_number,
              codeudor_phone: contractData.codeudor_phone,
              codeudor_email: contractData.codeudor_email,
              codeudor_address: contractData.codeudor_address,
              codeudor_city: contractData.codeudor_city,
              codeudor_occupation: contractData.codeudor_occupation,
              codeudor_monthly_income: contractData.codeudor_monthly_income,
              codeudor_employer: contractData.codeudor_employer,
              codeudor_position: contractData.codeudor_position,
              codeudor_work_phone: contractData.codeudor_work_phone,
              // Datos específicos para codeudor_finca_raiz
              ...(contractData.guarantee_type === 'codeudor_finca_raiz' && {
                property_matricula: contractData.property_matricula,
                property_address_guarantee: contractData.property_address_guarantee,
                property_city_guarantee: contractData.property_city_guarantee,
                property_department_guarantee: contractData.property_department_guarantee,
                property_area_guarantee: contractData.property_area_guarantee,
                property_predial_number: contractData.property_predial_number,
                property_catastral_number: contractData.property_catastral_number,
                property_linderos: contractData.property_linderos,
              }),
            },
          }),
        },
        maintenance_responsibility: 'landlord',
        utilities_responsibility: 'tenant',
        insurance_responsibility: 'tenant',
        landlord_approved: false,
        tenant_approved: false,
        landlord_signed: false,
        tenant_signed: false,
        published: false,
        workflow_history: contract?.workflow_history || [],
      };
      const updatedContract = await LandlordContractService.updateContractDraft(contractId, updatePayload);

      if (updatedContract) {
        setContract(updatedContract);
        setOriginalData({ ...contractData }); // Update original data reference
        setHasChanges(false);
        
        if (showMessage) {
        }

        if (onSave) {
          onSave(updatedContract);
        }
      }

    } catch (error) {
      setValidationErrors(['Error al guardar los cambios. Inténtelo nuevamente.']);
    } finally {
      setIsSaving(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    setValidationErrors([]);
    const errors: string[] = [];

    switch (activeStep) {
      case 0: // Información del Arrendador
        if (!contractData.landlord_full_name.trim()) errors.push('El nombre completo es requerido');
        if (!contractData.landlord_document_number.trim()) errors.push('El número de documento es requerido');
        if (!contractData.landlord_phone.trim()) errors.push('El teléfono es requerido');
        if (!contractData.landlord_email.trim()) errors.push('El email es requerido');
        break;

      case 1: // Detalles de la Propiedad
        if (!contractData.property_address.trim()) errors.push('La dirección de la propiedad es requerida');
        if (!contractData.property_area || contractData.property_area <= 0) errors.push('El área debe ser mayor a 0');
        break;

      case 2: // Condiciones Económicas
        if (!contractData.monthly_rent || contractData.monthly_rent <= 0) {
          errors.push('El canon mensual debe ser mayor a $0');
        }
        if (contractData.security_deposit < 0) {
          errors.push('El depósito de garantía no puede ser negativo');
        }
        break;

      case 3: // Términos del Contrato
        if (!contractData.contract_duration_months || contractData.contract_duration_months < 1) {
          errors.push('La duración del contrato debe ser de al menos 1 mes');
        }
        break;

      case 4: // Garantías del Contrato
        if (contractData.guarantee_type !== 'none') {
          if (!contractData.codeudor_full_name.trim()) errors.push('El nombre del codeudor es requerido');
          if (!contractData.codeudor_document_number.trim()) errors.push('El número de documento del codeudor es requerido');
          
          if (contractData.guarantee_type === 'codeudor_salario') {
            if (!contractData.codeudor_employer.trim()) errors.push('La empresa del codeudor es requerida');
            if (!contractData.codeudor_monthly_income || contractData.codeudor_monthly_income <= 0) {
              errors.push('Los ingresos mensuales del codeudor deben ser mayores a $0');
            }
          }
          
          if (contractData.guarantee_type === 'codeudor_finca_raiz') {
            if (!contractData.property_matricula.trim()) errors.push('La matrícula inmobiliaria es requerida');
            if (!contractData.property_address_guarantee.trim()) errors.push('La dirección del inmueble de garantía es requerida');
          }
        }
        break;
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep(prevActiveStep => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handlePreviewPDF = async () => {
    try {
      setPreviewDialogOpen(true);
      // Open PDF preview in new tab using the contract ID
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const pdfUrl = `${API_BASE_URL}/contracts/${contractId}/preview-pdf/`;
      window.open(pdfUrl, '_blank');
    } catch (error) {
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('¿Está seguro de descartar los cambios sin guardar?')) {
        if (onCancel) {
          onCancel();
        } else if (onClose) {
          onClose();
        }
      }
    } else {
      if (onCancel) {
        onCancel();
      } else if (onClose) {
        onClose();
      }
    }
  };

  const getChangedFields = (): string[] => {
    if (!originalData) return [];

    const changedFields: string[] = [];
    Object.keys(contractData).forEach(key => {
      const currentValue = contractData[key as keyof EditableContractData];
      const originalValue = originalData[key as keyof EditableContractData];

      if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
        changedFields.push(key);
      }
    });

    return changedFields;
  };

  const renderStepContent = (step: number): React.ReactNode => {
    switch (step) {
      case 0: // Información del Arrendador
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={contractData.landlord_full_name}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_full_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento</InputLabel>
                <Select
                  value={contractData.landlord_document_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, landlord_document_type: e.target.value }))}
                  label="Tipo de Documento"
                >
                  <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                  <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                  <MenuItem value="PP">Pasaporte</MenuItem>
                  <MenuItem value="NI">NIT</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Número de Documento"
                value={contractData.landlord_document_number}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_document_number: e.target.value }))}
              />
            </Grid>
            {/* Campos de expedición de documento */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lugar de Expedición del Documento"
                value={contractData.landlord_document_expedition_place}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_document_expedition_place: e.target.value }))}
                placeholder="Ej: Piedecuesta, Santander"
                helperText="Ciudad donde fue expedido el documento"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Expedición del Documento"
                type="date"
                value={contractData.landlord_document_expedition_date}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_document_expedition_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText="Fecha en que fue expedido el documento"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={contractData.landlord_phone}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={contractData.landlord_email}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={contractData.landlord_address}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={contractData.landlord_city}
                onChange={(e) => setContractData(prev => ({ ...prev, landlord_city: e.target.value }))}
              />
            </Grid>
          </Grid>
        );

      case 1: // Detalles de la Propiedad
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección de la Propiedad"
                value={contractData.property_address}
                onChange={(e) => setContractData(prev => ({ ...prev, property_address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Área (m²)"
                type="number"
                value={contractData.property_area}
                onChange={(e) => setContractData(prev => ({ ...prev, property_area: parseFloat(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Propiedad</InputLabel>
                <Select
                  value={contractData.property_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, property_type: e.target.value }))}
                  label="Tipo de Propiedad"
                >
                  <MenuItem value="apartamento">Apartamento</MenuItem>
                  <MenuItem value="casa">Casa</MenuItem>
                  <MenuItem value="oficina">Oficina</MenuItem>
                  <MenuItem value="local">Local Comercial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.property_furnished}
                    onChange={(e) => setContractData(prev => ({ ...prev, property_furnished: e.target.checked }))}
                  />
                }
                label="Amoblado"
              />
            </Grid>
          </Grid>
        );

      case 2: // Términos Económicos
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Arriendo Mensual"
                type="number"
                value={contractData.monthly_rent}
                onChange={(e) => setContractData(prev => ({ ...prev, monthly_rent: parseFloat(e.target.value) }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Depósito de Garantía"
                type="number"
                value={contractData.security_deposit}
                onChange={(e) => setContractData(prev => ({ ...prev, security_deposit: parseFloat(e.target.value) }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Duración (meses)"
                type="number"
                value={contractData.contract_duration_months}
                onChange={(e) => setContractData(prev => ({ ...prev, contract_duration_months: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Día de Pago"
                type="number"
                value={contractData.payment_day}
                onChange={(e) => setContractData(prev => ({ ...prev, payment_day: parseInt(e.target.value) }))}
                helperText="Día del mes (1-31)"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.utilities_included}
                    onChange={(e) => setContractData(prev => ({ ...prev, utilities_included: e.target.checked }))}
                  />
                }
                label="Servicios Incluidos"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contractData.pets_allowed}
                    onChange={(e) => setContractData(prev => ({ ...prev, pets_allowed: e.target.checked }))}
                  />
                }
                label="Mascotas Permitidas"
              />
            </Grid>
            {/* Divider para separar políticas adicionales */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Políticas de Convivencia
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Política de Huéspedes</InputLabel>
                <Select
                  value={contractData.guests_policy}
                  onChange={(e) => setContractData(prev => ({ ...prev, guests_policy: e.target.value as 'unlimited' | 'limited' | 'prohibited' }))}
                  label="Política de Huéspedes"
                >
                  <MenuItem value="unlimited">Sin Restricciones</MenuItem>
                  <MenuItem value="limited">Limitado (máx. 3 noches)</MenuItem>
                  <MenuItem value="prohibited">Prohibido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Máximo de Ocupantes"
                type="number"
                value={contractData.max_occupants}
                onChange={(e) => setContractData(prev => ({ ...prev, max_occupants: parseInt(e.target.value) || 1 }))}
                helperText="Número máximo de personas"
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Incremento de Arriendo</InputLabel>
                <Select
                  value={contractData.rent_increase_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, rent_increase_type: e.target.value as 'ipc' | 'fixed' | 'negotiable' }))}
                  label="Incremento de Arriendo"
                >
                  <MenuItem value="ipc">IPC (Índice de Precios al Consumidor)</MenuItem>
                  <MenuItem value="fixed">Porcentaje Fijo</MenuItem>
                  <MenuItem value="negotiable">Negociable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 3: // Sistema de Garantías
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Garantía</InputLabel>
                <Select
                  value={contractData.guarantee_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, guarantee_type: e.target.value as any }))}
                  label="Tipo de Garantía"
                >
                  <MenuItem value="none">Sin Garantía</MenuItem>
                  <MenuItem value="codeudor_salario">Codeudor (Salario)</MenuItem>
                  <MenuItem value="codeudor_finca_raiz">Codeudor (Finca Raíz)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {contractData.guarantee_type !== 'none' && (
              <>
                {/* Sección: Datos Personales del Codeudor */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Datos Personales del Codeudor
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre Completo del Codeudor"
                    value={contractData.codeudor_full_name}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_full_name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo Documento</InputLabel>
                    <Select
                      value={contractData.codeudor_document_type}
                      onChange={(e) => setContractData(prev => ({ ...prev, codeudor_document_type: e.target.value as any }))}
                      label="Tipo Documento"
                    >
                      <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                      <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                      <MenuItem value="NIT">NIT</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Número de Documento"
                    value={contractData.codeudor_document_number}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_document_number: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email del Codeudor"
                    type="email"
                    value={contractData.codeudor_email}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono del Codeudor"
                    value={contractData.codeudor_phone}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Dirección del Codeudor"
                    value={contractData.codeudor_address}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_address: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Ciudad"
                    value={contractData.codeudor_city}
                    onChange={(e) => setContractData(prev => ({ ...prev, codeudor_city: e.target.value }))}
                  />
                </Grid>

                {/* Sección: Información Laboral (para codeudor_salario) */}
                {contractData.guarantee_type === 'codeudor_salario' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        Información Laboral
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Empresa/Empleador"
                        value={contractData.codeudor_employer}
                        onChange={(e) => setContractData(prev => ({ ...prev, codeudor_employer: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Cargo/Posición"
                        value={contractData.codeudor_position}
                        onChange={(e) => setContractData(prev => ({ ...prev, codeudor_position: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Ingresos Mensuales"
                        type="number"
                        value={contractData.codeudor_monthly_income}
                        onChange={(e) => setContractData(prev => ({ ...prev, codeudor_monthly_income: parseFloat(e.target.value) || 0 }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Teléfono de Trabajo"
                        value={contractData.codeudor_work_phone}
                        onChange={(e) => setContractData(prev => ({ ...prev, codeudor_work_phone: e.target.value }))}
                      />
                    </Grid>
                  </>
                )}

                {/* Sección: Datos del Inmueble de Garantía (para codeudor_finca_raiz) */}
                {contractData.guarantee_type === 'codeudor_finca_raiz' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        Inmueble en Garantía
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Matrícula Inmobiliaria"
                        value={contractData.property_matricula}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_matricula: e.target.value }))}
                        required
                        helperText="Número de folio de matrícula inmobiliaria"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Número Predial"
                        value={contractData.property_predial_number}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_predial_number: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Dirección del Inmueble de Garantía"
                        value={contractData.property_address_guarantee}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_address_guarantee: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Ciudad"
                        value={contractData.property_city_guarantee}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_city_guarantee: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Departamento"
                        value={contractData.property_department_guarantee}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_department_guarantee: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Área (m²)"
                        type="number"
                        value={contractData.property_area_guarantee}
                        onChange={(e) => setContractData(prev => ({ ...prev, property_area_guarantee: parseFloat(e.target.value) || 0 }))}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}
          </Grid>
        );

      case 4: // Cláusulas Especiales
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Las cláusulas especiales se generan automáticamente basándose en las opciones seleccionadas.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Total de cláusulas especiales: {contractData.special_clauses?.length || 0}
              </Typography>
            </Grid>
          </Grid>
        );

      case 5: // Revisión y Confirmación
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="success">
                Revise todos los datos antes de guardar los cambios.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Cambios Realizados: {getChangedFields().length} campos modificados
              </Typography>
              {getChangedFields().length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {getChangedFields().map(field => (
                    <Chip key={field} label={field} size="small" sx={{ m: 0.5 }} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        );

      default:
        return <Typography>Paso no implementado</Typography>;
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box ml={2} flex={1}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={400} />
      </Paper>
    );
  }

  if (!contract) {
    return (
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <Alert severity="error">
          No se pudo cargar el contrato para edición.
        </Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1200, mx: 'auto', mt: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <EditIcon color="primary" sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h5" color="primary" gutterBottom>
                Editor de Borrador de Contrato
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contrato ID: {contractId} • {hasChanges && '● Sin guardar'}
              </Typography>
            </Box>
          </Box>
          
          {/* Action buttons */}
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreviewPDF}
              disabled={saving}
            >
              Vista Previa PDF
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<SaveIcon />}
              loading={saving}
              onClick={() => handleSave(true)}
              disabled={!hasChanges}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </LoadingButton>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </Box>
        </Box>

        {/* Changes indicator */}
        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Hay cambios sin guardar. Los cambios se guardan automáticamente cada 30 segundos.
            </Typography>
            {getChangedFields().length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  Campos modificados: {getChangedFields().join(', ')}
                </Typography>
              </Box>
            )}
          </Alert>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Corrija los siguientes errores:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}><Typography variant="body2">{error}</Typography></li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content - Editable fields for each step */}
        <Box sx={{ minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            {steps[activeStep]}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Paso {activeStep + 1} de {steps.length}
          </Typography>

          {/* Step Content Rendering */}
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Anterior
          </Button>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={loadContractData}
              disabled={loading || saving}
            >
              Restaurar Datos
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <LoadingButton
                variant="contained"
                startIcon={<SaveIcon />}
                loading={saving}
                onClick={() => handleSave(true)}
                disabled={!hasChanges}
              >
                Finalizar Edición
              </LoadingButton>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Siguiente
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* PDF Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <PdfIcon sx={{ mr: 1 }} />
            Vista Previa del Contrato
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: '600px' }}>
            <iframe
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/contracts/${contractId}/preview-pdf/`}
              width="100%"
              height="100%"
              title="Vista Previa del Contrato PDF"
              style={{ border: 'none', borderRadius: '4px' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContractDraftEditor;