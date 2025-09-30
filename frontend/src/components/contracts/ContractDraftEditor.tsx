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
  LoadingButton,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  SaveAs as SaveIcon,
  Preview as PreviewIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Legal as LegalIcon,
  Restore as RestoreIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { LandlordContractService } from '../../services/landlordContractService';
import { LandlordControlledContractData, CreateContractPayload } from '../../types/landlordContract';

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
  onClose
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
    property_matricula: '',
    property_address_guarantee: '',
    property_predial_number: '',
    property_catastral_number: '',
    property_linderos: '',
    property_area_guarantee: 0,
    property_department_guarantee: '',
    property_city_guarantee: '',
    requires_biometric_codeudor: false
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
    'Revisión y Actualización'
  ];

  // Load contract data on component mount
  useEffect(() => {
    loadContractData();
  }, [contractId]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return;

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
        
        console.log('✅ Contract loaded for editing:', contractResponse.id);
      }
    } catch (error) {
      console.error('❌ Error loading contract for editing:', error);
      setValidationErrors(['Error al cargar el contrato. Inténtelo nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const mapContractToEditableData = (contract: LandlordControlledContractData): EditableContractData => {
    // Extract data from contract and map to editable format
    const basicTerms = contract.basic_terms || {};
    const landlordData = contract.landlord_data || {};
    const propertyData = contract.property_data || {};
    const guaranteeData = basicTerms.guarantee_data || {};

    return {
      // Landlord data
      landlord_full_name: landlordData.full_name || '',
      landlord_document_type: landlordData.document_type || 'CC',
      landlord_document_number: landlordData.document_number || '',
      landlord_phone: landlordData.phone || '',
      landlord_email: landlordData.email || '',
      landlord_address: landlordData.address || '',
      landlord_city: landlordData.city || '',
      
      // Property data
      property_id: propertyData.property_id || '',
      property_address: propertyData.property_address || '',
      property_area: propertyData.property_area || 0,
      property_type: propertyData.property_type || 'apartment',
      property_furnished: propertyData.property_furnished || false,
      
      // Economic terms
      monthly_rent: basicTerms.monthly_rent || 0,
      security_deposit: basicTerms.security_deposit || 0,
      contract_duration_months: basicTerms.duration_months || 12,
      utilities_included: basicTerms.utilities_included || false,
      pets_allowed: basicTerms.pets_allowed || false,
      smoking_allowed: basicTerms.smoking_allowed || false,
      payment_day: basicTerms.payment_day || 5,
      
      // Contract template and clauses
      contract_template: contract.contract_template || 'rental_urban',
      special_clauses: contract.special_clauses || [],
      
      // Guarantee system
      guarantee_type: guaranteeData.guarantee_type || 'none',
      codeudor_full_name: guaranteeData.codeudor_full_name || '',
      codeudor_document_type: guaranteeData.codeudor_document_type || 'CC',
      codeudor_document_number: guaranteeData.codeudor_document_number || '',
      codeudor_phone: guaranteeData.codeudor_phone || '',
      codeudor_email: guaranteeData.codeudor_email || '',
      codeudor_address: guaranteeData.codeudor_address || '',
      codeudor_city: guaranteeData.codeudor_city || '',
      codeudor_employer: guaranteeData.codeudor_employer || '',
      codeudor_position: guaranteeData.codeudor_position || '',
      codeudor_monthly_income: guaranteeData.codeudor_monthly_income || 0,
      codeudor_work_phone: guaranteeData.codeudor_work_phone || '',
      property_matricula: guaranteeData.property_matricula || '',
      property_address_guarantee: guaranteeData.property_address_guarantee || '',
      property_predial_number: guaranteeData.property_predial_number || '',
      property_catastral_number: guaranteeData.property_catastral_number || '',
      property_linderos: guaranteeData.property_linderos || '',
      property_area_guarantee: guaranteeData.property_area_guarantee || 0,
      property_department_guarantee: guaranteeData.property_department_guarantee || '',
      property_city_guarantee: guaranteeData.property_city_guarantee || '',
      requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor || false
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

      // Prepare update payload
      const updatePayload = {
        landlord_data: {
          full_name: contractData.landlord_full_name,
          document_type: contractData.landlord_document_type,
          document_number: contractData.landlord_document_number,
          phone: contractData.landlord_phone,
          email: contractData.landlord_email,
          address: contractData.landlord_address,
          city: contractData.landlord_city,
        },
        property_data: {
          property_id: contractData.property_id,
          property_address: contractData.property_address,
          property_area: contractData.property_area,
          property_type: contractData.property_type,
          property_furnished: contractData.property_furnished,
        },
        basic_terms: {
          monthly_rent: contractData.monthly_rent,
          security_deposit: contractData.security_deposit,
          duration_months: contractData.contract_duration_months,
          utilities_included: contractData.utilities_included,
          pets_allowed: contractData.pets_allowed,
          smoking_allowed: contractData.smoking_allowed,
          payment_day: contractData.payment_day,
          guarantee_type: contractData.guarantee_type,
          guarantee_data: {
            guarantee_type: contractData.guarantee_type,
            codeudor_full_name: contractData.codeudor_full_name,
            codeudor_document_type: contractData.codeudor_document_type,
            codeudor_document_number: contractData.codeudor_document_number,
            codeudor_phone: contractData.codeudor_phone,
            codeudor_email: contractData.codeudor_email,
            codeudor_address: contractData.codeudor_address,
            codeudor_city: contractData.codeudor_city,
            codeudor_employer: contractData.codeudor_employer,
            codeudor_position: contractData.codeudor_position,
            codeudor_monthly_income: contractData.codeudor_monthly_income,
            codeudor_work_phone: contractData.codeudor_work_phone,
            property_matricula: contractData.property_matricula,
            property_address_guarantee: contractData.property_address_guarantee,
            property_predial_number: contractData.property_predial_number,
            property_catastral_number: contractData.property_catastral_number,
            property_linderos: contractData.property_linderos,
            property_area_guarantee: contractData.property_area_guarantee,
            property_department_guarantee: contractData.property_department_guarantee,
            property_city_guarantee: contractData.property_city_guarantee,
            requires_biometric_codeudor: contractData.requires_biometric_codeudor
          }
        },
        contract_template: contractData.contract_template,
        special_clauses: contractData.special_clauses
      };

      console.log('💾 Saving contract changes:', updatePayload);

      const updatedContract = await LandlordContractService.updateContractDraft(contractId, updatePayload);

      if (updatedContract) {
        setContract(updatedContract);
        setOriginalData({ ...contractData }); // Update original data reference
        setHasChanges(false);
        
        if (showMessage) {
          console.log('✅ Contract saved successfully');
        }

        if (onSave) {
          onSave(updatedContract);
        }
      }

    } catch (error) {
      console.error('❌ Error saving contract changes:', error);
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
      // TODO: Implement PDF preview functionality
    } catch (error) {
      console.error('Error generating PDF preview:', error);
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

        {/* Step Content - This would be similar to LandlordContractForm but with all fields editable and prefilled */}
        <Box sx={{ minHeight: 400 }}>
          {/* TODO: Implement step content rendering similar to LandlordContractForm */}
          <Typography variant="h6" gutterBottom>
            {steps[activeStep]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paso {activeStep + 1} de {steps.length}
          </Typography>
          
          {/* Placeholder for step content */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed #ccc', borderRadius: 1 }}>
            <Typography variant="body1" color="text.secondary">
              Formulario de edición para: {steps[activeStep]}
            </Typography>
          </Box>
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
          <Typography variant="body2" color="text.secondary">
            Vista previa del PDF con los cambios actuales...
          </Typography>
          {/* TODO: Implement PDF preview iframe or component */}
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