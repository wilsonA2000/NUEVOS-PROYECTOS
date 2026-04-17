/**
 * LandlordContractForm - Nuevo sistema de contratos controlado por arrendador
 * Reemplaza ProfessionalContractForm con el sistema avanzado implementado
 * Integración completa con workflow biométrico y gestión profesional
 */

import React, { useState, useEffect } from 'react';
import { vhColors } from '../../theme/tokens';
import { useQuery } from '@tanstack/react-query';
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
  AccordionDetails,
} from '@mui/material';
import {
  Assignment as ContractIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  PersonOutline as TenantIcon,
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
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  AutoFixHigh as AutoFillIcon,
  Notes as NotesIcon,
  Construction as ConstructionIcon,
  CalendarToday as CalendarIcon,
  Wc as WcIcon,
  Chair as ChairIcon,
  Pets as PetsIcon,
  SmokingRooms as SmokingRoomsIcon,
  AutoAwesome as SparkleIcon,
  RocketLaunch as RocketIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';

// Services y hooks del nuevo sistema
import { LandlordContractService } from '../../services/landlordContractService';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../hooks/useAuth';
import { useProperties } from '../../hooks/useProperties';
import { viewContractPDF } from '../../utils/contractPdfUtils';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

// Types del nuevo sistema
import {
  LandlordControlledContractData,
  ContractWorkflowState,
  PropertyType,
  DocumentType,
  LandlordData,
  TenantData,
  CreateContractPayload,
} from '../../types/landlordContract';

// Servicio de matching para auto-fill desde candidatos
import { matchingService } from '../../services/matchingService';

// Utilidades
import { format, addMonths, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Componentes biométricos y documentos
import CodeudorBiometricFlow from './CodeudorBiometricFlow';
// REMOVIDO: GuaranteeDocumentUpload (ahora en TenantDocumentUpload)

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
      'Reformas y mejoras al inmueble',
    ],
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
      'Transferencia y cesión del contrato',
    ],
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
      'Responsabilidad por daños',
    ],
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
      'Cultivos existentes y nuevos',
    ],
  },
};

// Configuraciones por tipo de propiedad
const PROPERTY_CONFIGURATIONS = {
  apartamento: {
    deposit_months: [1, 2],
    typical_duration: [6, 12, 24],
    included_services: ['agua', 'luz', 'gas', 'internet', 'tv_cable', 'administracion'],
    common_clauses: ['no_mascotas', 'no_fiestas', 'horario_visitas'],
  },
  casa: {
    deposit_months: [1, 2, 3],
    typical_duration: [12, 24, 36],
    included_services: ['agua', 'luz', 'gas', 'internet', 'jardineria', 'vigilancia'],
    common_clauses: ['mantenimiento_jardin', 'uso_piscina', 'mascotas_permitidas'],
  },
  local_comercial: {
    deposit_months: [2, 3, 6],
    typical_duration: [12, 24, 36, 60],
    included_services: ['agua', 'luz', 'gas', 'internet', 'administracion', 'seguridad'],
    common_clauses: ['horario_comercial', 'publicidad_exterior', 'adecuaciones_permitidas'],
  },
  oficina: {
    deposit_months: [1, 2, 3],
    typical_duration: [12, 24, 36],
    included_services: ['agua', 'luz', 'internet', 'administracion', 'seguridad', 'parqueadero'],
    common_clauses: ['horario_oficina', 'reunion_clientes', 'equipos_oficina'],
  },
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
  onCancel,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess } = useSnackbar();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  // Obtener parámetros de query string
  const [searchParams] = React.useState(() => new URLSearchParams(window.location.search));
  const queryPropertyId = searchParams.get('property');
  
  const { properties: allProperties = [], isLoading: propertiesLoading, error: propertiesError } = useProperties();
  
  // Hook adicional para cargar propiedad específica si viene del workflow
  const { data: specificProperty, isLoading: specificPropertyLoading } = useQuery({
    queryKey: ['property', queryPropertyId],
    queryFn: async () => {
      if (!queryPropertyId) return null;
      // Usar el propertyService para mantener consistencia con el resto de la app
      const data = await propertyService.getProperty(queryPropertyId);
      return data;
    },
    enabled: !!queryPropertyId && (allProperties as any)?.length === 0,
  });
  const queryTenantId = searchParams.get('tenant');

  // Usar propertyId del prop o del query string
  const effectivePropertyId = propertyId || queryPropertyId;

  // Filtrar solo propiedades del usuario actual que estén disponibles
  const properties = React.useMemo(() => {
    // Combinar allProperties con specificProperty si está disponible
    let combinedProperties = [...((allProperties as any) || [])];

    // Si tenemos una propiedad específica del workflow y no está en allProperties, agregarla
    if (specificProperty && Array.isArray(combinedProperties) && !(combinedProperties as any[]).find((p: any) => p.id === specificProperty.id)) {
      if (process.env.NODE_ENV === 'development') {
      }
      combinedProperties = [specificProperty, ...combinedProperties];
    }

    // Early returns si no tenemos datos necesarios
    if (!combinedProperties || !Array.isArray(combinedProperties)) {
      return [];
    }
    
    if (!user || !user.id) {
      return [];
    }
    
    if (combinedProperties.length === 0) {
      return [];
    }
    
    // Reduced logging - only log summary info once 
    const shouldLogDebug = process.env.NODE_ENV === 'development' && combinedProperties.length > 0;
    
    // Aplicar filtro menos restrictivo
    const filteredProperties = combinedProperties.filter(property => {
      if (!property) return false;
      
      // Verificar ownership con múltiples fallbacks - MÁS PERMISIVO
      const isOwner = (
        // Direct landlord comparison (string)
        (typeof property.landlord === 'string' && property.landlord === user.id) ||
        // Landlord object with id
        (property.landlord && typeof property.landlord === 'object' && property.landlord.id === user.id) ||
        // Landlord object with email fallback
        (property.landlord && typeof property.landlord === 'object' && property.landlord.email === user.email) ||
        // Fallback to owner field
        (property.owner === user.id) ||
        // Si el usuario es arrendador y no hay landlord definido, incluir
        (user.user_type === 'landlord' && !property.landlord)
      );
      
      // Verificar availability - MÁS PERMISIVO
      const isAvailable = (
        property.is_available === true ||
        property.is_available === 'true' ||
        !property.status || 
        property.status === 'available' || 
        property.status === 'AVAILABLE' ||
        property.status === 'disponible' ||
        property.status === 'active' ||
        property.status === 'ACTIVE' ||
        property.status === 'published' ||
        property.status === 'PUBLISHED'
      );
      
      // Para debugging, incluir TODAS las propiedades si el usuario es arrendador
      const shouldInclude = user.user_type === 'landlord' ? true : (isOwner && isAvailable);
      
      // Removed per-property logging to prevent spam
      
      return shouldInclude;
    });
    
    // Only log summary once when there are significant changes
    if (shouldLogDebug && filteredProperties.length === 0 && combinedProperties.length > 0) {
    }
    
    // Si no hay propiedades después del filtro, mostrar advertencia
    if (filteredProperties.length === 0 && combinedProperties.length > 0) {
    }
    
    return filteredProperties;
  }, [allProperties, specificProperty, user]);

  // Función para mapear employment_type del backend al frontend
  const mapEmploymentType = (backendType: string | undefined): TenantData['employment_type'] => {
    const mapping: Record<string, TenantData['employment_type']> = {
      'employed': 'employee',
      'self_employed': 'independent',
      'freelancer': 'independent',
      'employee': 'employee',
      'independent': 'independent',
      'business_owner': 'business_owner',
      'retired': 'retired',
      'pensionado': 'retired',
      'student': 'student',
      'estudiante': 'student',
      'unemployed': 'unemployed',
      'desempleado': 'unemployed',
      'other': 'employee',
    };
    return mapping[backendType?.toLowerCase() || ''] || 'employee';
  };

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof PROFESSIONAL_CONTRACT_TEMPLATES>('residential_urban');
  const [previewMode, setPreviewMode] = useState(false);
  const [contractPreviewMode, setContractPreviewMode] = useState(false);
  const [contractDraftContent, setContractDraftContent] = useState('');
  const [contractHasBeenPreviewed, setContractHasBeenPreviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);

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
    workflow_history: [],
  });

  // Landlord data state
  const [landlordData, setLandlordData] = useState<LandlordData>({
    full_name: user ? `${user.first_name} ${user.last_name}`.trim() : '',
    document_type: 'CC',
    document_number: '',
    document_expedition_date: '',
    document_expedition_place: '',
    phone: user?.phone_number || user?.phone || '',
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
    profession: '',
  });

  // Tenant data state - NEW: Datos del arrendatario editables manualmente o auto-llenados desde matching
  const [tenantData, setTenantData] = useState<Partial<TenantData>>({
    full_name: '',
    document_type: 'CC',
    document_number: '',
    document_expedition_date: '',
    document_expedition_place: '',
    phone: '',
    email: '',
    current_address: '',
    city: '',
    department: '',
    country: 'Colombia',
    employment_type: 'employee',
    company_name: '',
    position: '',
    monthly_income: 0,
    emergency_contact: '',
    emergency_phone: '',
    emergency_relationship: '',
    personal_references: [],
    commercial_references: [],
  });

  // Matching candidates state for auto-fill
  const [matchingCandidates, setMatchingCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Property details state
  const [propertyData, setPropertyData] = useState({
    property_id: effectivePropertyId || '',
    property_address: '',
    property_area: 0,
    property_stratum: 3,
    property_rooms: 2,
    property_bathrooms: 2,
    property_parking_spaces: 1,
    property_furnished: false,
  });

  // Guarantee system state - 3 options
  const [guaranteeData, setGuaranteeData] = useState({
    guarantee_type: 'none' as 'none' | 'codeudor_salario' | 'codeudor_finca_raiz',
    // Codeudor personal data
    codeudor_full_name: '',
    codeudor_document_type: 'CC' as 'CC' | 'CE' | 'TI' | 'NIT',
    codeudor_document_number: '',
    codeudor_phone: '',
    codeudor_email: '',
    codeudor_address: '',
    codeudor_city: '',
    codeudor_employer: '',
    codeudor_position: '',
    codeudor_monthly_income: 0,
    codeudor_work_phone: '',
    // Garantía real inmobiliaria fields
    property_matricula: '',
    property_address_guarantee: '',
    property_predial_number: '',
    property_catastral_number: '',
    property_linderos: '',
    property_area_guarantee: 0,
    property_department_guarantee: '',
    property_city_guarantee: '',
    // Document requirement flags
    requires_biometric_codeudor: false,
  });

  // Codeudor biometric flow states
  const [codeudorBiometricOpen, setCodeudorBiometricOpen] = useState(false);
  const [codeudorBiometricData, setCodeudorBiometricData] = useState<any>(null);
  const [requiresCodeudorBiometric, setRequiresCodeudorBiometric] = useState(false);

  // REMOVIDO: guaranteeDocuments (ahora manejado por TenantDocumentUpload)

  const steps = [
    'Información del Arrendador',
    'Información del Arrendatario',  // NEW: Paso para datos del arrendatario
    'Detalles de la Propiedad',
    'Condiciones Económicas',
    'Términos del Contrato',
    'Garantías del Contrato',
    'Cláusulas Especiales',
    'Revisión y Creación',
  ];

  // Actualizar propertyId en propertyData cuando cambie el prop
  useEffect(() => {
    if (effectivePropertyId && effectivePropertyId !== propertyData.property_id) {
      
      // Auto-seleccionar la propiedad si está disponible
      const selectedProperty = properties.find(p => p.id === effectivePropertyId) || 
                              (specificProperty?.id === effectivePropertyId ? specificProperty : null);
      
      if (selectedProperty) {
        handlePropertySelect(effectivePropertyId);
      } else {
        // Si no se encuentra en properties, solo actualizar el ID
        setPropertyData(prev => ({ ...prev, property_id: effectivePropertyId }));
      }
    }
  }, [effectivePropertyId, properties, specificProperty]);

  // Trigger auto-population when specificProperty loads
  useEffect(() => {
    if (specificProperty && effectivePropertyId === specificProperty.id && !propertyData.property_address) {
      handlePropertySelect(specificProperty.id);
    }
  }, [specificProperty, effectivePropertyId, propertyData.property_address]);

  // Handle property selection - AUTO-FILL DATA FROM PROPERTY MODEL
  const handlePropertySelect = (selectedPropertyId: string) => {
    // Find property from multiple sources
    const selectedProperty = properties.find(p => p.id === selectedPropertyId) || 
                            specificProperty?.id === selectedPropertyId ? specificProperty : null;
    
    if (selectedProperty) {
      
      // Build complete address string with all available location data
      const fullAddress = [
        selectedProperty.address,
        selectedProperty.city,
        selectedProperty.state,
        selectedProperty.country,
      ].filter(Boolean).join(', ');
      
      // Map property type from English to Spanish
      const propertyTypeMapping: Record<string, string> = {
        'apartment': 'apartamento',
        'house': 'casa', 
        'studio': 'apartamento',
        'penthouse': 'apartamento',
        'townhouse': 'casa',
        'commercial': 'local_comercial',
        'office': 'oficina',
        'warehouse': 'bodega',
        'land': 'lote',
        'room': 'habitacion',
      };
      
      // Update property data with comprehensive mapping from Property model
      const newPropertyData = {
        property_id: selectedProperty.id,
        property_address: fullAddress || selectedProperty.address || '',
        property_area: Number(selectedProperty.total_area) || Number((selectedProperty as any).area) || 0,
        property_stratum: (selectedProperty as any).stratum || selectedProperty.floor_number || 3,
        property_rooms: Number(selectedProperty.bedrooms) || 0,
        property_bathrooms: Number(selectedProperty.bathrooms) || 0,
        property_parking_spaces: Number(selectedProperty.parking_spaces) || 0,
        property_furnished: Boolean(selectedProperty.furnished),
      };
      
      setPropertyData(newPropertyData);
      
      // Update contract data with comprehensive auto-filled values
      setContractData(prev => ({
        ...prev,
        property_type: (propertyTypeMapping[selectedProperty.property_type] || selectedProperty.property_type || 'apartamento') as PropertyType,
        property_id: selectedProperty.id,
        // Auto-fill financial data
        monthly_rent: prev.monthly_rent || Number(selectedProperty.rent_price) || 0,
        security_deposit: prev.security_deposit || Number(selectedProperty.security_deposit) || (Number(selectedProperty.rent_price) || 0),
        // Auto-fill property policies
        pets_allowed: Boolean(selectedProperty.pets_allowed),
        smoking_allowed: Boolean(selectedProperty.smoking_allowed),
        // Auto-fill lease terms
        contract_duration_months: Number(selectedProperty.minimum_lease_term) || 12,
        utilities_included: Array.isArray(selectedProperty.utilities_included) && selectedProperty.utilities_included.length > 0,
        // Auto-fill occupancy based on bedrooms
        max_occupants: Number(selectedProperty.bedrooms) || 2,
        // Auto-fill additional details
        utilities_responsibility: selectedProperty.utilities_included?.length > 0 ? 'landlord' : 'tenant',
        internet_included: selectedProperty.utilities_included?.includes('internet') || false,
      }));
    } else {
    }
  };

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
      const contractsResponse = await LandlordContractService.getContracts();
      // Find the specific contract from the list
      const specificContract = (contractsResponse as any).results?.find((c: any) => c.id === contractId) ||
        (Array.isArray(contractsResponse) ? (contractsResponse as any[]).find((c: any) => c.id === contractId) : null);
      if (specificContract) {
        setContractData(specificContract);
        if (specificContract.landlord_data) {
          setLandlordData(specificContract.landlord_data);
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
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

      let result: LandlordControlledContractData;

      if (isEdit && contractId) {
        // Para editar, enviar datos completos con garantías
        const completeContractData: Partial<LandlordControlledContractData> = {
          ...contractData,
          ...propertyData,
          landlord_data: landlordData,
          // Incluir datos de garantías en la edición
          ...(contractData as any).contract_terms && {
            contract_terms: {
              ...(contractData as any).contract_terms,
              guarantee_data: guaranteeData,
            },
          },
        };
        result = await LandlordContractService.updateContractDraft(contractId, completeContractData);
      } else {
        // Para crear, usar el payload mejorado con garantías y TODOS los datos del formulario
        // ============================================================================
        // PAYLOAD COMPLETO - Incluye TODOS los campos de los 7 pasos del formulario
        // ============================================================================
        const createPayload: any = {
          property_id: propertyData.property_id || '',
          contract_template: (contractData as any).contract_template || 'rental_urban',

          // ============================================================================
          // PASO 3: CONDICIONES ECONÓMICAS (basic_terms)
          // ============================================================================
          basic_terms: {
            // Condiciones económicas principales
            monthly_rent: contractData.monthly_rent || 0,
            security_deposit: contractData.security_deposit || 0,
            duration_months: contractData.contract_duration_months || 12,
            payment_day: (contractData as any).payment_day || 5,
            rent_increase_type: (contractData as any).rent_increase_type || 'ipc',

            // PASO 4: TÉRMINOS DEL CONTRATO - Servicios incluidos
            utilities_included: contractData.utilities_included || false,
            internet_included: (contractData as any).internet_included || false,

            // PASO 4: TÉRMINOS DEL CONTRATO - Políticas de uso
            pets_allowed: contractData.pets_allowed || false,
            smoking_allowed: contractData.smoking_allowed || false,
            guests_policy: (contractData as any).guests_policy || 'limited',
            max_occupants: (contractData as any).max_occupants || 4,

            // PASO 4: TÉRMINOS DEL CONTRATO - Garantías y responsabilidades
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            maintenance_responsibility: (contractData as any).maintenance_responsibility || 'tenant',

            // Información de garantía si aplica
            ...(guaranteeData.guarantee_type !== 'none' && {
              guarantee_type: guaranteeData.guarantee_type as any,
              requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor,
            }),
          },

          // ============================================================================
          // PASO 1: INFORMACIÓN DEL ARRENDADOR (landlord_data)
          // ============================================================================
          landlord_data: {
            // Datos de identificación
            full_name: landlordData.full_name || '',
            document_type: landlordData.document_type || 'CC',
            document_type_display: landlordData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   landlordData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   landlordData.document_type === 'NIT' ? 'NIT' :
                                   landlordData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: landlordData.document_number || '',
            document_expedition_date: landlordData.document_expedition_date || '',
            document_expedition_place: landlordData.document_expedition_place || '',

            // Datos de contacto
            email: landlordData.email || '',
            phone: landlordData.phone || '',
            profession: landlordData.profession || '',

            // Dirección completa
            address: landlordData.address || '',
            city: landlordData.city || '',
            department: landlordData.department || '',
            country: landlordData.country || 'Colombia',
            full_address: `${landlordData.address || ''}, ${landlordData.city || ''}, ${landlordData.department || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),

            // Contacto de emergencia
            emergency_contact_name: landlordData.emergency_contact || '',
            emergency_contact_phone: landlordData.emergency_phone || '',

            // Datos bancarios (opcional)
            bank_name: landlordData.bank_name || '',
            bank_account_type: landlordData.account_type || '',
            bank_account_number: landlordData.bank_account || '',
          },

          // ============================================================================
          // PASO 2: INFORMACIÓN DEL ARRENDATARIO (tenant_data) - NEW
          // ============================================================================
          tenant_data: {
            // Datos de identificación del arrendatario
            full_name: tenantData.full_name || '',
            document_type: tenantData.document_type || 'CC',
            document_type_display: tenantData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   tenantData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   tenantData.document_type === 'NIT' ? 'NIT' :
                                   tenantData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: tenantData.document_number || '',
            document_expedition_date: tenantData.document_expedition_date || '',
            document_expedition_place: tenantData.document_expedition_place || '',

            // Datos de contacto del arrendatario
            email: tenantData.email || '',
            phone: tenantData.phone || '',

            // Dirección actual del arrendatario
            current_address: tenantData.current_address || '',
            city: tenantData.city || '',
            department: tenantData.department || '',
            country: tenantData.country || 'Colombia',

            // Información laboral del arrendatario
            employment_type: tenantData.employment_type || 'employee',
            company_name: tenantData.company_name || '',
            position: tenantData.position || '',
            monthly_income: tenantData.monthly_income || 0,

            // Contacto de emergencia del arrendatario
            emergency_contact_name: tenantData.emergency_contact || '',
            emergency_contact_phone: tenantData.emergency_phone || '',
            emergency_contact_relationship: tenantData.emergency_relationship || '',
          },

          // ============================================================================
          // PASO 3: DETALLES DE LA PROPIEDAD (property_data)
          // ============================================================================
          property_data: {
            // Identificación de la propiedad
            property_id: propertyData.property_id || '',
            property_address: propertyData.property_address || '',
            property_type: contractData.property_type || 'house',

            // Características físicas
            property_area: propertyData.property_area || 0,
            property_rooms: propertyData.property_rooms || 0,
            property_bathrooms: propertyData.property_bathrooms || 0,
            property_parking_spaces: propertyData.property_parking_spaces || 0,
            property_floors: (propertyData as any).property_floors || 1,
            property_year: (propertyData as any).property_year || null,

            // Estado y categorización
            property_furnished: propertyData.property_furnished || false,
            property_stratum: propertyData.property_stratum || 0,

            // Políticas de la propiedad (de paso 2)
            mascotas_permitidas: (propertyData as any).mascotas_permitidas || false,
            fumadores_permitidos: (propertyData as any).fumadores_permitidos || false,
            minimo_meses: (propertyData as any).minimo_meses || 12,
          },

          // ============================================================================
          // PASO 5: GARANTÍAS DEL CONTRATO (guarantee_terms)
          // ============================================================================
          guarantee_terms: {
            // Configuración general de garantía
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            guarantee_type: guaranteeData.guarantee_type || 'none',
            requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor || false,

            // Datos del codeudor (si aplica)
            codeudor_data: guaranteeData.guarantee_type !== 'none' ? {
              // Datos de identificación del codeudor
              codeudor_full_name: guaranteeData.codeudor_full_name || '',
              codeudor_document_type: guaranteeData.codeudor_document_type || 'CC',
              codeudor_document_type_display: guaranteeData.codeudor_document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                              guaranteeData.codeudor_document_type === 'CE' ? 'Cédula de Extranjería' :
                                              guaranteeData.codeudor_document_type === 'NIT' ? 'NIT' :
                                              guaranteeData.codeudor_document_type === 'TI' ? 'Tarjeta de Identidad' : 'Cédula de Ciudadanía',
              codeudor_document_number: guaranteeData.codeudor_document_number || '',

              // Datos de contacto del codeudor
              codeudor_phone: guaranteeData.codeudor_phone || '',
              codeudor_email: guaranteeData.codeudor_email || '',
              codeudor_address: guaranteeData.codeudor_address || '',
              codeudor_city: guaranteeData.codeudor_city || '',

              // ============================================================
              // DATOS ESPECÍFICOS PARA CODEUDOR CON SALARIO
              // ============================================================
              ...(guaranteeData.guarantee_type === 'codeudor_salario' && {
                codeudor_employer: guaranteeData.codeudor_employer || '',
                codeudor_position: guaranteeData.codeudor_position || '',
                codeudor_monthly_income: guaranteeData.codeudor_monthly_income || 0,
                codeudor_work_phone: guaranteeData.codeudor_work_phone || '',
              }),

              // ============================================================
              // DATOS ESPECÍFICOS PARA CODEUDOR CON FINCA RAÍZ (GARANTÍA REAL)
              // ============================================================
              ...(guaranteeData.guarantee_type === 'codeudor_finca_raiz' && {
                // Identificación del inmueble de garantía
                property_matricula: guaranteeData.property_matricula || '',
                property_area_guarantee: guaranteeData.property_area_guarantee || 0,

                // Dirección completa del inmueble de garantía
                property_address_guarantee: guaranteeData.property_address_guarantee || '',
                property_city_guarantee: guaranteeData.property_city_guarantee || '',
                property_department_guarantee: guaranteeData.property_department_guarantee || '',

                // Datos catastrales y legales
                property_predial_number: guaranteeData.property_predial_number || '',
                property_catastral_number: guaranteeData.property_catastral_number || '',
                property_linderos: guaranteeData.property_linderos || '',
              }),
            } : undefined,
          },

          // ============================================================================
          // PASO 6: CLÁUSULAS ESPECIALES (special_clauses)
          // ============================================================================
          special_clauses: contractData.special_clauses || [],

          // ============================================================================
          // CONTENIDO DEL CONTRATO GENERADO
          // Este contenido se usa como respaldo y para el preview del borrador
          // ============================================================================
          contract_content: contractDraftContent || generateContractPreview(),
        };
        
        result = await LandlordContractService.createContractDraft(createPayload);
      }

      
      // SINCRONIZACIÓN WORKFLOW: Actualizar PropertyInterestRequest si viene del workflow
      const queryMatchId = searchParams.get('match');
      if (queryMatchId && result?.id) {
        try {

          // Llamar endpoint para actualizar el workflow
          const workflowResponse = await fetch('/api/v1/contracts/workflow-action/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              match_request_id: queryMatchId,
              action: 'contract_created',
              contract_data: {
                contract_id: result.id,
                created_at: new Date().toISOString(),
              },
            }),
          });

          if (workflowResponse.ok) {
            const workflowResult = await workflowResponse.json();
          } else {
          }
        } catch (error) {
        }
      }

      // ========================================================================
      // AVANZAR ESTADO A TENANT_INVITED AUTOMÁTICAMENTE
      // Después de crear el borrador, completamos los datos del arrendador
      // para avanzar el estado de DRAFT → TENANT_INVITED
      // Esto permite que el arrendatario pueda ver y revisar el borrador
      // ========================================================================
      if (result?.id && user) {
        try {

          // Construir landlord_data usando los datos del usuario autenticado
          const landlordDataPayload: any = {
            full_name: user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.email.split('@')[0],
            document_type: (user.document_type || 'CC') as 'CC' | 'CE' | 'NIT' | 'PP' | 'TI',
            document_number: user.document_number || '0000000000',
            phone: user.phone || user.phone_number || '',
            email: user.email,
            address: propertyData.property_address || '',
            city: user.city || '',
            department: user.state || '',
            country: user.country || 'Colombia',
            emergency_contact: user.first_name || 'No especificado',
          };

          await LandlordContractService.completeLandlordData({
            contract_id: result.id,
            landlord_data: landlordDataPayload,
          });


          // Opcionalmente enviar invitación por email si el arrendatario tiene email
          if (tenantData.email) {
            try {
              await LandlordContractService.sendTenantInvitation({
                contract_id: result.id,
                tenant_email: tenantData.email,
                personal_message: `Hola ${tenantData.full_name || 'Estimado arrendatario'}, te invito a revisar el borrador del contrato de arrendamiento.`,
              });
            } catch (emailError) {
              // No bloqueamos - el estado ya avanzó correctamente
            }
          }
        } catch (advanceError) {
          // No bloqueamos el flujo - el usuario puede hacerlo manualmente desde el dashboard
        }
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        // Navigate to contract detail view to continue workflow (signature, authentication, publication)
        if (result.id) {
          navigate(`/app/contracts/landlord/${result.id}`);
        } else {
          // Fallback to contracts dashboard
          navigate('/app/contracts/landlord');
        }
      }

    } catch (error: any) {

      const errorMessage = error.response?.data?.error
        || error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Error desconocido al guardar el contrato';

      setValidationErrors([`Error al guardar el contrato: ${errorMessage}`]);
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

  // Codeudor biometric flow handlers
  const handleCodeudorBiometricSuccess = (biometricData: any) => {
    setCodeudorBiometricData(biometricData);
    setCodeudorBiometricOpen(false);
    
    // Update guarantee data with biometric completion
    setGuaranteeData(prev => ({
      ...prev,
      biometric_completed: true,
      biometric_data: biometricData,
    }));
    
    // Show success message
    setValidationErrors(['Verificación biométrica del codeudor completada exitosamente']);
    
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      setValidationErrors([]);
    }, 3000);
  };

  const handleCodeudorBiometricError = (error: string) => {
    setCodeudorBiometricOpen(false);
    setValidationErrors([`Error en verificación biométrica del codeudor: ${error}`]);
  };

  const handleCodeudorBiometricClose = () => {
    setCodeudorBiometricOpen(false);
  };

  // REMOVIDO: handleGuaranteeDocumentsChange (documentos manejados por arrendatario)

  const generateContractPreview = () => {
    const currentDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Template base legal profesional para vivienda urbana
    const contractContent = `
# CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA

**Conforme a la Ley 820 de 2003 del Régimen de Arrendamiento de Vivienda Urbana**

---

**FECHA DE SUSCRIPCIÓN:** ${currentDate}

**LUGAR DE SUSCRIPCIÓN:** ${landlordData.city}, ${landlordData.department}

---

## IDENTIFICACIÓN DE LAS PARTES

### ARRENDADOR (PRIMERA PARTE)
- **Nombre completo:** ${landlordData.full_name}
- **Documento de identidad:** ${landlordData.document_type} No. ${landlordData.document_number}
- **Teléfono:** ${landlordData.phone}
- **Correo electrónico:** ${landlordData.email}
- **Dirección de notificaciones:** ${landlordData.address}, ${landlordData.city}, ${landlordData.department}

### ARRENDATARIO (SEGUNDA PARTE)
**[Los datos del arrendatario se completarán cuando acepte la invitación]**

### INMUEBLE OBJETO DEL CONTRATO
- **Dirección:** ${propertyData.property_address}
- **Tipo de inmueble:** ${contractData.property_type}
- **Área construida:** ${propertyData.property_area} metros cuadrados
- **Número de habitaciones:** ${propertyData.property_rooms}
- **Número de baños:** ${propertyData.property_bathrooms}
- **Parqueaderos:** ${propertyData.property_parking_spaces}
- **Estado del inmueble:** ${propertyData.property_furnished ? 'Amoblado' : 'Sin amoblar'}

---

## CLÁUSULAS CONTRACTUALES

### PRIMERA - OBJETO DEL CONTRATO
EL ARRENDADOR entrega en arrendamiento al ARRENDATARIO el inmueble identificado anteriormente, quien lo destinará exclusivamente para **vivienda familiar**, de conformidad con lo establecido en el artículo 3° de la Ley 820 de 2003.

### SEGUNDA - CANON DE ARRENDAMIENTO
El canon mensual de arrendamiento es de **$${contractData.monthly_rent?.toLocaleString('es-CO')} PESOS COLOMBIANOS** (${contractData.monthly_rent ? new Intl.NumberFormat('es-CO').format(contractData.monthly_rent) : 'N/A'}), que deberá ser cancelado por EL ARRENDATARIO dentro de los primeros **${contractData.payment_day || 5}** días de cada mes.

### TERCERA - DEPÓSITO EN DINERO
EL ARRENDATARIO entregará al ARRENDADOR la suma de **$${contractData.security_deposit?.toLocaleString('es-CO')} PESOS COLOMBIANOS** como depósito en dinero, conforme al artículo 19 de la Ley 820 de 2003, equivalente a ${contractData.security_deposit && contractData.monthly_rent ? Math.round((contractData.security_deposit / contractData.monthly_rent) * 10) / 10 : 'N/A'} meses de canon.

### CUARTA - DURACIÓN DEL CONTRATO
El término de duración del presente contrato es de **${contractData.contract_duration_months} MESES**, contados a partir de la fecha de entrega del inmueble. El contrato se prorrogará automáticamente por períodos iguales, salvo manifestación en contrario de cualquiera de las partes con una antelación mínima de tres (3) meses.

### QUINTA - INCREMENTO DEL CANON
El canon de arrendamiento se reajustará anualmente en una proporción igual al incremento del Índice de Precios al Consumidor (IPC) certificado por el DANE, conforme al artículo 20 de la Ley 820 de 2003.

### SEXTA - SERVICIOS PÚBLICOS
Los servicios públicos domiciliarios (energía, acueducto, alcantarillado, aseo, gas y telecomunicaciones) ${contractData.utilities_included ? 'están incluidos en el canon de arrendamiento' : 'estarán a cargo del ARRENDATARIO'} y deberán cancelarse oportunamente.

### SÉPTIMA - OBLIGACIONES DEL ARRENDATARIO
1. Pagar puntualmente el canon de arrendamiento y los servicios públicos.
2. Destinar el inmueble exclusivamente para vivienda familiar.
3. Conservar el inmueble en buen estado y restituirlo en las mismas condiciones.
4. Permitir inspecciones del inmueble, previa cita acordada.
5. No realizar modificaciones sin autorización escrita del ARRENDADOR.
6. ${contractData.pets_allowed ? 'Cumplir las normas de tenencia responsable de mascotas.' : 'No introducir mascotas en el inmueble.'}
7. ${contractData.smoking_allowed ? 'Fumar únicamente en áreas ventiladas.' : 'Abstenerse de fumar dentro del inmueble.'}
8. No exceder el número máximo de ${contractData.max_occupants || 4} ocupantes.

### OCTAVA - OBLIGACIONES DEL ARRENDADOR
1. Entregar el inmueble en condiciones de habitabilidad.
2. Mantener el inmueble en estado adecuado para la habitación.
3. Realizar las reparaciones necesarias por deterioro natural.
4. Respetar el derecho del ARRENDATARIO al goce pacífico del inmueble.
5. Cumplir con las obligaciones establecidas en la Ley 820 de 2003.

### NOVENA - REPARACIONES LOCATIVAS
Las reparaciones locativas estarán a cargo del ${contractData.maintenance_responsibility === 'tenant' ? 'ARRENDATARIO' : contractData.maintenance_responsibility === 'landlord' ? 'ARRENDADOR' : 'ARRENDATARIO para reparaciones menores y del ARRENDADOR para reparaciones mayores'}, conforme a lo establecido en los artículos 2029 y 2030 del Código Civil.

### DÉCIMA - TERMINACIÓN DEL CONTRATO
El contrato terminará por las causales previstas en el artículo 22 de la Ley 820 de 2003, y por mutuo acuerdo entre las partes.

### DÉCIMA PRIMERA - RESTITUCIÓN DEL INMUEBLE
Al terminar el contrato, EL ARRENDATARIO deberá restituir el inmueble en las mismas condiciones en que lo recibió, salvo el deterioro natural por el uso adecuado.

${contractData.guarantor_required ? `
### DÉCIMA SEGUNDA - CODEUDOR
El presente contrato cuenta con codeudor solidario, cuya información se completará en el proceso de formalización.` : ''}

${contractData.special_clauses && contractData.special_clauses.length > 0 ? `
### CLÁUSULAS ADICIONALES
${contractData.special_clauses.map((clause, index) => `**${index + 1}.** ${clause}`).join('\n')}` : ''}

---

## FIRMAS

En constancia de lo anterior, se firma el presente contrato en la fecha indicada.

**EL ARRENDADOR**

_____________________________
${landlordData.full_name}
${landlordData.document_type} ${landlordData.document_number}


**EL ARRENDATARIO**

_____________________________
[Se completará con firma biométrica digital]

${contractData.guarantor_required ? `
**EL CODEUDOR**

_____________________________
[Se completará en el proceso de formalización]` : ''}

---

## INFORMACIÓN LEGAL

- **Marco legal:** Ley 820 de 2003, Código Civil Colombiano
- **Jurisdicción:** República de Colombia
- **Estado del documento:** BORRADOR DIGITAL
- **Sistema:** VeriHome - Plataforma Digital de Arrendamiento
- **Fecha de generación:** ${currentDate}

---

*Este contrato cumple con la normatividad colombiana vigente para arrendamiento de vivienda urbana. Ha sido generado digitalmente y será perfeccionado mediante firmas biométricas de las partes.*
    `;

    return contractContent;
  };

  const handleContractPreview = async () => {
    if (!validateCurrentStep()) {
      setValidationErrors(['Complete todos los campos requeridos antes de ver la previsualización del contrato']);
      return;
    }

    // ============================================================================
    // PREVISUALIZACIÓN PDF PROFESIONAL
    // Si ya existe contractId, actualizamos y mostramos el PDF
    // Si NO existe, creamos el borrador primero y luego mostramos el PDF
    // ============================================================================

    try {
      setLoading(true);

      // Usar el contractId del prop O el que se creó durante esta sesión
      const activeContractId = contractId || createdContractId;

      if (activeContractId) {
        // Ya existe el contrato - actualizar y mostrar PDF
        // ============================================================================
        // PAYLOAD COMPLETO PARA ACTUALIZACIÓN - IDÉNTICO AL DE CREAR BORRADOR
        // Incluye TODOS los campos: garantías, políticas, codeudor, etc.
        // ============================================================================
        const updatePayload: any = {
          property_id: propertyData.property_id || '',
          contract_template: (contractData as any).contract_template || 'rental_urban',

          // ============================================================================
          // CONDICIONES ECONÓMICAS (basic_terms)
          // ============================================================================
          basic_terms: {
            monthly_rent: contractData.monthly_rent || 0,
            security_deposit: contractData.security_deposit || 0,
            duration_months: contractData.contract_duration_months || 12,
            payment_day: (contractData as any).payment_day || 5,
            rent_increase_type: (contractData as any).rent_increase_type || 'ipc',

            // Servicios incluidos
            utilities_included: contractData.utilities_included || false,
            internet_included: (contractData as any).internet_included || false,

            // Políticas de uso
            pets_allowed: contractData.pets_allowed || false,
            smoking_allowed: contractData.smoking_allowed || false,
            guests_policy: (contractData as any).guests_policy || 'limited',
            max_occupants: (contractData as any).max_occupants || 4,

            // Garantías y responsabilidades
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            maintenance_responsibility: (contractData as any).maintenance_responsibility || 'tenant',

            // Información de garantía si aplica
            ...(guaranteeData.guarantee_type !== 'none' && {
              guarantee_type: guaranteeData.guarantee_type as any,
              requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor,
            }),
          },

          // ============================================================================
          // INFORMACIÓN DEL ARRENDADOR (landlord_data)
          // ============================================================================
          landlord_data: {
            full_name: landlordData.full_name || '',
            document_type: landlordData.document_type || 'CC',
            document_type_display: landlordData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   landlordData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   landlordData.document_type === 'NIT' ? 'NIT' :
                                   landlordData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: landlordData.document_number || '',
            document_expedition_date: landlordData.document_expedition_date || '',
            document_expedition_place: landlordData.document_expedition_place || '',
            email: landlordData.email || '',
            phone: landlordData.phone || '',
            profession: landlordData.profession || '',
            address: landlordData.address || '',
            city: landlordData.city || '',
            department: landlordData.department || '',
            country: landlordData.country || 'Colombia',
            full_address: `${landlordData.address || ''}, ${landlordData.city || ''}, ${landlordData.department || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
            emergency_contact_name: landlordData.emergency_contact || '',
            emergency_contact_phone: landlordData.emergency_phone || '',
            bank_name: landlordData.bank_name || '',
            bank_account_type: landlordData.account_type || '',
            bank_account_number: landlordData.bank_account || '',
          },

          // ============================================================================
          // INFORMACIÓN DEL ARRENDATARIO (tenant_data)
          // ============================================================================
          tenant_data: {
            full_name: tenantData.full_name || '',
            document_type: tenantData.document_type || 'CC',
            document_type_display: tenantData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   tenantData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   tenantData.document_type === 'NIT' ? 'NIT' :
                                   tenantData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: tenantData.document_number || '',
            document_expedition_date: tenantData.document_expedition_date || '',
            document_expedition_place: tenantData.document_expedition_place || '',
            email: tenantData.email || '',
            phone: tenantData.phone || '',
            current_address: tenantData.current_address || '',
            city: tenantData.city || '',
            department: tenantData.department || '',
            country: tenantData.country || 'Colombia',
            employment_type: tenantData.employment_type || 'employee',
            company_name: tenantData.company_name || '',
            position: tenantData.position || '',
            monthly_income: tenantData.monthly_income || 0,
            emergency_contact_name: tenantData.emergency_contact || '',
            emergency_contact_phone: tenantData.emergency_phone || '',
            emergency_contact_relationship: tenantData.emergency_relationship || '',
          },

          // ============================================================================
          // DETALLES DE LA PROPIEDAD (property_data)
          // ============================================================================
          property_data: {
            property_id: propertyData.property_id || '',
            property_address: propertyData.property_address || '',
            property_type: contractData.property_type || 'house',
            property_area: propertyData.property_area || 0,
            property_rooms: propertyData.property_rooms || 0,
            property_bathrooms: propertyData.property_bathrooms || 0,
            property_parking_spaces: propertyData.property_parking_spaces || 0,
            property_floors: (propertyData as any).property_floors || 1,
            property_year: (propertyData as any).property_year || null,
            property_furnished: propertyData.property_furnished || false,
            property_stratum: propertyData.property_stratum || 0,
            mascotas_permitidas: (propertyData as any).mascotas_permitidas || false,
            fumadores_permitidos: (propertyData as any).fumadores_permitidos || false,
            minimo_meses: (propertyData as any).minimo_meses || 12,
          },

          // ============================================================================
          // GARANTÍAS DEL CONTRATO (guarantee_terms) - INCLUYE CODEUDOR
          // ============================================================================
          guarantee_terms: {
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            guarantee_type: guaranteeData.guarantee_type || 'none',
            requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor || false,

            // Datos del codeudor (si aplica)
            codeudor_data: guaranteeData.guarantee_type !== 'none' ? {
              codeudor_full_name: guaranteeData.codeudor_full_name || '',
              codeudor_document_type: guaranteeData.codeudor_document_type || 'CC',
              codeudor_document_type_display: guaranteeData.codeudor_document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                              guaranteeData.codeudor_document_type === 'CE' ? 'Cédula de Extranjería' :
                                              guaranteeData.codeudor_document_type === 'NIT' ? 'NIT' :
                                              guaranteeData.codeudor_document_type === 'TI' ? 'Tarjeta de Identidad' : 'Cédula de Ciudadanía',
              codeudor_document_number: guaranteeData.codeudor_document_number || '',
              codeudor_phone: guaranteeData.codeudor_phone || '',
              codeudor_email: guaranteeData.codeudor_email || '',
              codeudor_address: guaranteeData.codeudor_address || '',
              codeudor_city: guaranteeData.codeudor_city || '',

              // Datos específicos para codeudor con salario
              ...(guaranteeData.guarantee_type === 'codeudor_salario' && {
                codeudor_employer: guaranteeData.codeudor_employer || '',
                codeudor_position: guaranteeData.codeudor_position || '',
                codeudor_monthly_income: guaranteeData.codeudor_monthly_income || 0,
                codeudor_work_phone: guaranteeData.codeudor_work_phone || '',
              }),

              // Datos específicos para codeudor con finca raíz
              ...(guaranteeData.guarantee_type === 'codeudor_finca_raiz' && {
                property_matricula: guaranteeData.property_matricula || '',
                property_area_guarantee: guaranteeData.property_area_guarantee || 0,
                property_address_guarantee: guaranteeData.property_address_guarantee || '',
                property_city_guarantee: guaranteeData.property_city_guarantee || '',
                property_department_guarantee: guaranteeData.property_department_guarantee || '',
                property_predial_number: guaranteeData.property_predial_number || '',
                property_catastral_number: guaranteeData.property_catastral_number || '',
                property_linderos: guaranteeData.property_linderos || '',
              }),
            } : undefined,
          },

          // ============================================================================
          // CLÁUSULAS ESPECIALES
          // ============================================================================
          special_clauses: contractData.special_clauses || [],
          contract_content: contractDraftContent || generateContractPreview(),
        };

        await LandlordContractService.updateContractDraft(activeContractId, updatePayload);
        viewContractPDF(activeContractId);
        setContractHasBeenPreviewed(true);
      } else {
        // NO existe el contrato - crear primero como borrador y luego mostrar PDF
        // Confirmar con el usuario antes de crear el borrador silenciosamente
        const userConfirmed = await confirm(
          'Se creará un borrador del contrato para generar la vista previa. ¿Desea continuar?',
          { title: 'Crear borrador' },
        );
        if (!userConfirmed) {
          setLoading(false);
          return;
        }

        // ============================================================================
        // PAYLOAD COMPLETO PARA PREVISUALIZACIÓN - IDÉNTICO AL DE CREAR BORRADOR
        // Incluye TODOS los campos: garantías, políticas, codeudor, etc.
        // ============================================================================
        const createPayload: any = {
          property_id: propertyData.property_id || '',
          contract_template: (contractData as any).contract_template || 'rental_urban',

          // ============================================================================
          // CONDICIONES ECONÓMICAS (basic_terms)
          // ============================================================================
          basic_terms: {
            monthly_rent: contractData.monthly_rent || 0,
            security_deposit: contractData.security_deposit || 0,
            duration_months: contractData.contract_duration_months || 12,
            payment_day: (contractData as any).payment_day || 5,
            rent_increase_type: (contractData as any).rent_increase_type || 'ipc',

            // Servicios incluidos
            utilities_included: contractData.utilities_included || false,
            internet_included: (contractData as any).internet_included || false,

            // Políticas de uso
            pets_allowed: contractData.pets_allowed || false,
            smoking_allowed: contractData.smoking_allowed || false,
            guests_policy: (contractData as any).guests_policy || 'limited',
            max_occupants: (contractData as any).max_occupants || 4,

            // Garantías y responsabilidades
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            maintenance_responsibility: (contractData as any).maintenance_responsibility || 'tenant',

            // Información de garantía si aplica
            ...(guaranteeData.guarantee_type !== 'none' && {
              guarantee_type: guaranteeData.guarantee_type as any,
              requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor,
            }),
          },

          // ============================================================================
          // INFORMACIÓN DEL ARRENDADOR (landlord_data)
          // ============================================================================
          landlord_data: {
            full_name: landlordData.full_name || '',
            document_type: landlordData.document_type || 'CC',
            document_type_display: landlordData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   landlordData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   landlordData.document_type === 'NIT' ? 'NIT' :
                                   landlordData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: landlordData.document_number || '',
            document_expedition_date: landlordData.document_expedition_date || '',
            document_expedition_place: landlordData.document_expedition_place || '',
            email: landlordData.email || '',
            phone: landlordData.phone || '',
            profession: landlordData.profession || '',
            address: landlordData.address || '',
            city: landlordData.city || '',
            department: landlordData.department || '',
            country: landlordData.country || 'Colombia',
            full_address: `${landlordData.address || ''}, ${landlordData.city || ''}, ${landlordData.department || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
            emergency_contact_name: landlordData.emergency_contact || '',
            emergency_contact_phone: landlordData.emergency_phone || '',
            bank_name: landlordData.bank_name || '',
            bank_account_type: landlordData.account_type || '',
            bank_account_number: landlordData.bank_account || '',
          },

          // ============================================================================
          // INFORMACIÓN DEL ARRENDATARIO (tenant_data)
          // ============================================================================
          tenant_data: {
            full_name: tenantData.full_name || '',
            document_type: tenantData.document_type || 'CC',
            document_type_display: tenantData.document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                   tenantData.document_type === 'CE' ? 'Cédula de Extranjería' :
                                   tenantData.document_type === 'NIT' ? 'NIT' :
                                   tenantData.document_type === 'PP' ? 'Pasaporte' : 'Cédula de Ciudadanía',
            document_number: tenantData.document_number || '',
            document_expedition_date: tenantData.document_expedition_date || '',
            document_expedition_place: tenantData.document_expedition_place || '',
            email: tenantData.email || '',
            phone: tenantData.phone || '',
            current_address: tenantData.current_address || '',
            city: tenantData.city || '',
            department: tenantData.department || '',
            country: tenantData.country || 'Colombia',
            employment_type: tenantData.employment_type || 'employee',
            company_name: tenantData.company_name || '',
            position: tenantData.position || '',
            monthly_income: tenantData.monthly_income || 0,
            emergency_contact_name: tenantData.emergency_contact || '',
            emergency_contact_phone: tenantData.emergency_phone || '',
            emergency_contact_relationship: tenantData.emergency_relationship || '',
          },

          // ============================================================================
          // DETALLES DE LA PROPIEDAD (property_data)
          // ============================================================================
          property_data: {
            property_id: propertyData.property_id || '',
            property_address: propertyData.property_address || '',
            property_type: contractData.property_type || 'house',
            property_area: propertyData.property_area || 0,
            property_rooms: propertyData.property_rooms || 0,
            property_bathrooms: propertyData.property_bathrooms || 0,
            property_parking_spaces: propertyData.property_parking_spaces || 0,
            property_floors: (propertyData as any).property_floors || 1,
            property_year: (propertyData as any).property_year || null,
            property_furnished: propertyData.property_furnished || false,
            property_stratum: propertyData.property_stratum || 0,
            mascotas_permitidas: (propertyData as any).mascotas_permitidas || false,
            fumadores_permitidos: (propertyData as any).fumadores_permitidos || false,
            minimo_meses: (propertyData as any).minimo_meses || 12,
          },

          // ============================================================================
          // GARANTÍAS DEL CONTRATO (guarantee_terms) - INCLUYE CODEUDOR
          // ============================================================================
          guarantee_terms: {
            guarantor_required: contractData.guarantor_required || false,
            guarantor_type: contractData.guarantor_type || 'personal',
            guarantee_type: guaranteeData.guarantee_type || 'none',
            requires_biometric_codeudor: guaranteeData.requires_biometric_codeudor || false,

            // Datos del codeudor (si aplica)
            codeudor_data: guaranteeData.guarantee_type !== 'none' ? {
              codeudor_full_name: guaranteeData.codeudor_full_name || '',
              codeudor_document_type: guaranteeData.codeudor_document_type || 'CC',
              codeudor_document_type_display: guaranteeData.codeudor_document_type === 'CC' ? 'Cédula de Ciudadanía' :
                                              guaranteeData.codeudor_document_type === 'CE' ? 'Cédula de Extranjería' :
                                              guaranteeData.codeudor_document_type === 'NIT' ? 'NIT' :
                                              guaranteeData.codeudor_document_type === 'TI' ? 'Tarjeta de Identidad' : 'Cédula de Ciudadanía',
              codeudor_document_number: guaranteeData.codeudor_document_number || '',
              codeudor_phone: guaranteeData.codeudor_phone || '',
              codeudor_email: guaranteeData.codeudor_email || '',
              codeudor_address: guaranteeData.codeudor_address || '',
              codeudor_city: guaranteeData.codeudor_city || '',

              // Datos específicos para codeudor con salario
              ...(guaranteeData.guarantee_type === 'codeudor_salario' && {
                codeudor_employer: guaranteeData.codeudor_employer || '',
                codeudor_position: guaranteeData.codeudor_position || '',
                codeudor_monthly_income: guaranteeData.codeudor_monthly_income || 0,
                codeudor_work_phone: guaranteeData.codeudor_work_phone || '',
              }),

              // Datos específicos para codeudor con finca raíz
              ...(guaranteeData.guarantee_type === 'codeudor_finca_raiz' && {
                property_matricula: guaranteeData.property_matricula || '',
                property_area_guarantee: guaranteeData.property_area_guarantee || 0,
                property_address_guarantee: guaranteeData.property_address_guarantee || '',
                property_city_guarantee: guaranteeData.property_city_guarantee || '',
                property_department_guarantee: guaranteeData.property_department_guarantee || '',
                property_predial_number: guaranteeData.property_predial_number || '',
                property_catastral_number: guaranteeData.property_catastral_number || '',
                property_linderos: guaranteeData.property_linderos || '',
              }),
            } : undefined,
          },

          // ============================================================================
          // CLÁUSULAS ESPECIALES
          // ============================================================================
          special_clauses: contractData.special_clauses || [],
          contract_content: contractDraftContent || generateContractPreview(),
        };

        const result = await LandlordContractService.createContractDraft(createPayload);

        if (result?.id) {
          setCreatedContractId(result.id);
          viewContractPDF(result.id);
          setContractHasBeenPreviewed(true);
        } else {
          throw new Error('No se pudo crear el borrador');
        }
      }
    } catch (error) {
      setValidationErrors(['Error al generar la previsualización del contrato. Intente nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContractChanges = () => {
    // Aquí podrías implementar lógica adicional para parsear cambios del contenido editado
    // Por ahora solo cerramos el modal manteniendo los cambios
    setContractPreviewMode(false);
    
    // Mostrar confirmación
    setTimeout(() => {
      showSuccess('Los cambios en el borrador del contrato han sido guardados. Puede continuar con la creación.');
    }, 200);
  };

  const getRecommendedDeposit = (): number => {
    if (!contractData.property_type || !contractData.monthly_rent) return 0;
    
    const config = PROPERTY_CONFIGURATIONS[contractData.property_type as keyof typeof PROPERTY_CONFIGURATIONS];
    const recommendedMonths = config?.deposit_months[0] || 1;
    
    return contractData.monthly_rent * recommendedMonths;
  };

  const validateCurrentStep = (): boolean => {
    setValidationErrors([]);
    const errors: string[] = [];

    switch (activeStep) {
      case 0: // Información del Arrendador
        if (!landlordData.full_name.trim()) errors.push('El nombre completo es requerido');
        if (!landlordData.document_number.trim()) errors.push('El número de documento es requerido');
        if (!landlordData.phone.trim()) errors.push('El teléfono es requerido');
        if (!landlordData.email.trim()) errors.push('El email es requerido');
        if (!landlordData.address.trim()) errors.push('La dirección es requerida');
        if (!landlordData.city.trim()) errors.push('La ciudad es requerida');
        break;

      case 1: // Información del Arrendatario (NEW)
        if (!tenantData.full_name?.trim()) errors.push('El nombre completo del arrendatario es requerido');
        if (!tenantData.document_number?.trim()) errors.push('El número de documento del arrendatario es requerido');
        if (!tenantData.phone?.trim()) errors.push('El teléfono del arrendatario es requerido');
        if (!tenantData.email?.trim()) errors.push('El email del arrendatario es requerido');
        if (!tenantData.current_address?.trim()) errors.push('La dirección actual del arrendatario es requerida');
        if (!tenantData.city?.trim()) errors.push('La ciudad del arrendatario es requerida');
        break;

      case 2: // Detalles de la Propiedad (was case 1)
        if (!propertyData.property_id) errors.push('Debe seleccionar una propiedad');
        if (!propertyData.property_address.trim()) errors.push('La dirección de la propiedad es requerida');
        break;

      case 3: // Condiciones Económicas (was case 2)
        if (!contractData.monthly_rent || contractData.monthly_rent <= 0) {
          errors.push('El canon mensual debe ser mayor a $0');
        }
        if (!contractData.security_deposit || contractData.security_deposit < 0) {
          errors.push('El depósito de garantía no puede ser negativo');
        }
        break;

      case 4: // Términos del Contrato (was case 3)
        if (!contractData.contract_duration_months || contractData.contract_duration_months < 1) {
          errors.push('La duración del contrato debe ser de al menos 1 mes');
        }
        break;

      case 5: // Garantías del Contrato (was case 4)
        if (guaranteeData.guarantee_type !== 'none') {
          // Validar campos comunes del codeudor
          if (!guaranteeData.codeudor_full_name.trim()) errors.push('El nombre del codeudor es requerido');
          if (!guaranteeData.codeudor_document_number.trim()) errors.push('El número de documento del codeudor es requerido');
          if (!guaranteeData.codeudor_phone.trim()) errors.push('El teléfono del codeudor es requerido');
          if (!guaranteeData.codeudor_email.trim()) errors.push('El email del codeudor es requerido');
          if (!guaranteeData.codeudor_address.trim()) errors.push('La dirección del codeudor es requerida');
          if (!guaranteeData.codeudor_city.trim()) errors.push('La ciudad del codeudor es requerida');

          // Validaciones específicas para codeudor con salario
          if (guaranteeData.guarantee_type === 'codeudor_salario') {
            if (!guaranteeData.codeudor_employer.trim()) errors.push('La empresa del codeudor es requerida');
            if (!guaranteeData.codeudor_position.trim()) errors.push('El cargo del codeudor es requerido');
            if (!guaranteeData.codeudor_monthly_income || guaranteeData.codeudor_monthly_income <= 0) {
              errors.push('Los ingresos mensuales del codeudor deben ser mayores a $0');
            }
          }

          // Validaciones específicas para codeudor con finca raíz
          if (guaranteeData.guarantee_type === 'codeudor_finca_raiz') {
            if (!guaranteeData.property_matricula.trim()) errors.push('La matrícula inmobiliaria es requerida');
            if (!guaranteeData.property_address_guarantee.trim()) errors.push('La dirección del inmueble de garantía es requerida');
            if (!guaranteeData.property_predial_number.trim()) errors.push('El número predial es requerido');
            if (!guaranteeData.property_catastral_number.trim()) errors.push('El número catastral es requerido');
            if (!guaranteeData.property_linderos.trim()) errors.push('Los linderos del inmueble son requeridos');
            if (!guaranteeData.property_department_guarantee.trim()) errors.push('El departamento es requerido');
            if (!guaranteeData.property_city_guarantee.trim()) errors.push('La ciudad del inmueble de garantía es requerida');
            if (!guaranteeData.property_area_guarantee || guaranteeData.property_area_guarantee <= 0) {
              errors.push('El área del inmueble de garantía debe ser mayor a 0 m²');
            }
          }

          // NOTA: Validación de documentos de garantía removida
          // Los documentos ahora son subidos por el arrendatario en la etapa 2 del workflow
          if ((guaranteeData.guarantee_type as string) !== 'none') {
          }
        }
        break;

      case 6: // Cláusulas Especiales (was case 5)
        // Las cláusulas especiales son opcionales, no hay validaciones requeridas
        break;

      case 7: // Revisión y Creación (was case 6)
        // Validación final de todos los datos
        if (!landlordData.full_name.trim() || !contractData.monthly_rent || !propertyData.property_id) {
          errors.push('Revise que todos los campos requeridos estén completos');
        }
        // También validar datos del arrendatario
        if (!tenantData.full_name?.trim() || !tenantData.document_number?.trim()) {
          errors.push('Revise que los datos del arrendatario estén completos');
        }
        break;
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }

    return true;
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
                label="Lugar de Expedición *"
                value={landlordData.document_expedition_place}
                onChange={(e) => setLandlordData(prev => ({ ...prev, document_expedition_place: e.target.value }))}
                placeholder="Ej: Medellín, Bogotá, Cali"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Expedición *"
                type="date"
                value={landlordData.document_expedition_date}
                onChange={(e) => setLandlordData(prev => ({ ...prev, document_expedition_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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

      case 1: // Información del Arrendatario (NEW)
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <TenantIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Información del Arrendatario
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Proporciona la información del arrendatario. Puedes llenar los campos manualmente o auto-completar desde candidatos de matching.
              </Typography>
            </Grid>

            {/* Botón de Auto-llenado desde Matching */}
            {propertyData.property_id && (
              <Grid item xs={12}>
                <Alert
                  severity="info"
                  icon={<AutoFillIcon />}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={async () => {
                        setLoadingCandidates(true);
                        try {
                          const response = await matchingService.getMyMatchRequests();
                          const queryMatchId = searchParams.get('match');

                          // Manejar tanto respuestas paginadas como arrays directos
                          // API puede retornar: { results: [...] } o directamente [...]
                          const rawData = response.data;
                          const matchRequests = Array.isArray(rawData)
                            ? rawData
                            : (rawData?.results || rawData?.data || []);


                          // Filtrar candidatos elegibles para crear contrato:
                          // - Candidatos en stage 3 del workflow (listos para contrato)
                          // - O candidatos aceptados
                          // - Para esta propiedad específica
                          // - O el match específico de la URL
                          const eligibleRequests = matchRequests.filter((r: any) => {
                            // Si hay un match específico en la URL, priorizarlo
                            if (queryMatchId && r.id === queryMatchId) {
                              return true;
                            }

                            // Verificar property_id (puede venir como string o como objeto)
                            const matchPropertyId = r.property?.id || r.property;
                            const isMatchingProperty = matchPropertyId === propertyData.property_id;

                            // Aceptar candidatos en stage 3 del workflow (etapa de contrato)
                            const isInContractStage = r.workflow_stage === 3;

                            // O candidatos con status accepted
                            const isAccepted = r.status === 'accepted';

                            return isMatchingProperty && (isInContractStage || isAccepted);
                          });

                          setMatchingCandidates(eligibleRequests);

                          if (eligibleRequests.length === 0) {
                          }
                        } catch (error) {
                        } finally {
                          setLoadingCandidates(false);
                        }
                      }}
                      disabled={loadingCandidates}
                    >
                      {loadingCandidates ? 'Cargando...' : 'Cargar Candidatos'}
                    </Button>
                  }
                >
                  Puedes auto-llenar los datos desde candidatos de matching aceptados para esta propiedad.
                </Alert>
              </Grid>
            )}

            {/* Selector de candidatos de matching */}
            {matchingCandidates.length > 0 && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Seleccionar Candidato de Matching</InputLabel>
                  <Select
                    value={selectedCandidate?.id || ''}
                    onChange={(e) => {
                      const candidate = matchingCandidates.find(c => c.id === e.target.value);
                      if (candidate) {
                        setSelectedCandidate(candidate);

                        // Extraer datos del tenant - puede ser un objeto o string ID
                        const tenantObj = typeof candidate.tenant === 'object' ? candidate.tenant : null;

                        // Auto-llenar datos del arrendatario desde el candidato
                        // Priorizar campos de nivel raíz del MatchRequest (tenant_name, tenant_email, etc.)
                        // Luego usar datos del objeto tenant si existen
                        const newTenantData = {
                          full_name: candidate.tenant_name || tenantObj?.name || tenantObj?.full_name ||
                                     (tenantObj?.first_name ? `${tenantObj.first_name} ${tenantObj.last_name || ''}`.trim() : '') || '',
                          document_type: tenantObj?.document_type || 'CC',
                          document_number: tenantObj?.document_number || '',
                          phone: candidate.tenant_phone || tenantObj?.phone || tenantObj?.phone_number || '',
                          email: candidate.tenant_email || tenantObj?.email || '',
                          current_address: tenantObj?.address || tenantObj?.current_address || '',
                          city: tenantObj?.city || '',
                          employment_type: mapEmploymentType(candidate.employment_type),
                          company_name: candidate.company_name || '',
                          position: candidate.position || '',
                          monthly_income: candidate.monthly_income || 0,
                          occupation: candidate.position || candidate.employment_type || '',
                        };

                        setTenantData(prev => ({
                          ...prev,
                          ...newTenantData,
                        }));
                      }
                    }}
                    label="Seleccionar Candidato de Matching"
                  >
                    {matchingCandidates.map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.tenant_name || candidate.tenant?.email || `Candidato ${candidate.id.slice(0, 8)}`}
                        {candidate.monthly_income && ` - Ingresos: $${candidate.monthly_income.toLocaleString()}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Datos Personales del Arrendatario
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre Completo *"
                value={tenantData.full_name || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, full_name: e.target.value }))}
                error={validationErrors.some(err => err.includes('nombre') && err.includes('arrendatario'))}
                helperText="Nombre completo como aparece en el documento de identidad"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento</InputLabel>
                <Select
                  value={tenantData.document_type || 'CC'}
                  onChange={(e) => setTenantData(prev => ({ ...prev, document_type: e.target.value as DocumentType }))}
                  label="Tipo de Documento"
                >
                  <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                  <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                  <MenuItem value="PP">Pasaporte</MenuItem>
                  <MenuItem value="NIT">NIT</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número de Documento *"
                value={tenantData.document_number || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, document_number: e.target.value }))}
                error={validationErrors.some(err => err.includes('documento') && err.includes('arrendatario'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lugar de Expedición *"
                value={tenantData.document_expedition_place || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, document_expedition_place: e.target.value }))}
                placeholder="Ej: Medellín, Bogotá, Cali"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Expedición *"
                type="date"
                value={tenantData.document_expedition_date || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, document_expedition_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono *"
                value={tenantData.phone || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, phone: e.target.value }))}
                error={validationErrors.some(err => err.includes('teléfono') && err.includes('arrendatario'))}
                placeholder="+57 300 123 4567"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={tenantData.email || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, email: e.target.value }))}
                error={validationErrors.some(err => err.includes('email') && err.includes('arrendatario'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Empleo</InputLabel>
                <Select
                  value={tenantData.employment_type || 'employee'}
                  onChange={(e) => setTenantData(prev => ({ ...prev, employment_type: e.target.value as TenantData['employment_type'] }))}
                  label="Tipo de Empleo"
                >
                  <MenuItem value="employee">Empleado</MenuItem>
                  <MenuItem value="independent">Independiente</MenuItem>
                  <MenuItem value="business_owner">Empresario</MenuItem>
                  <MenuItem value="retired">Pensionado</MenuItem>
                  <MenuItem value="student">Estudiante</MenuItem>
                  <MenuItem value="unemployed">Desempleado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección Actual *"
                value={tenantData.current_address || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, current_address: e.target.value }))}
                error={validationErrors.some(err => err.includes('dirección') && err.includes('arrendatario'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad *"
                value={tenantData.city || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, city: e.target.value }))}
                error={validationErrors.some(err => err.includes('ciudad') && err.includes('arrendatario'))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Departamento"
                value={tenantData.department || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, department: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Información Laboral
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Empresa / Empleador"
                value={tenantData.company_name || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cargo / Posición"
                value={tenantData.position || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, position: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ingresos Mensuales"
                type="number"
                value={tenantData.monthly_income || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, monthly_income: parseFloat(e.target.value) || 0 }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Contacto de Emergencia del Arrendatario
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nombre del Contacto"
                value={tenantData.emergency_contact || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, emergency_contact: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Teléfono de Emergencia"
                value={tenantData.emergency_phone || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, emergency_phone: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Relación"
                value={tenantData.emergency_relationship || ''}
                onChange={(e) => setTenantData(prev => ({ ...prev, emergency_relationship: e.target.value }))}
                placeholder="Ej: Padre, Madre, Hermano"
              />
            </Grid>
          </Grid>
        );

      case 2: // Detalles de la Propiedad (was case 1)
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
            
            {/* Selected Property Display */}
            {effectivePropertyId && (
              <Grid item xs={12}>
                {(() => {
                  const selectedProperty = properties.find(p => p.id === effectivePropertyId) || specificProperty;
                  
                  if (!selectedProperty) {
                    return (
                      <Card variant="outlined" sx={{ p: 2, bgcolor: 'warning.light', borderColor: 'warning.main' }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <WarningIcon color="warning" />
                          <Typography variant="h6" color="warning.main">
                            Propiedad Preseleccionada
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Cargando información de la propiedad...
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Esta propiedad fue seleccionada automáticamente desde la solicitud de interés.
                        </Typography>
                      </Card>
                    );
                  }

                  return (
                    <Card variant="outlined" sx={{ p: 3, bgcolor: 'success.50', borderColor: 'success.main', border: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CheckIcon color="success" />
                        <Typography variant="h6" color="success.main">
                          Propiedad Preseleccionada para Contrato
                        </Typography>
                      </Box>
                      
                      {/* Property Header */}
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                          {selectedProperty.title || `${selectedProperty.property_type} - ${selectedProperty.city}`}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}, {selectedProperty.country}
                        </Typography>
                        {selectedProperty.description && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 1, color: 'text.secondary' }}>
                            <NotesIcon sx={{ fontSize: 16, mt: 0.25 }} />
                            <Typography variant="body2">
                              {selectedProperty.description.substring(0, 200)}{selectedProperty.description.length > 200 ? '...' : ''}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {/* Property Details Grid */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {/* Basic Details */}
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="text.secondary">Área Total</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {selectedProperty.total_area || selectedProperty.area || 'N/A'} m²
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="text.secondary">Habitaciones</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {selectedProperty.bedrooms || 'N/A'} hab.
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="text.secondary">Baños</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {selectedProperty.bathrooms || 'N/A'} baños
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="text.secondary">Parqueaderos</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {selectedProperty.parking_spaces || 'N/A'} parq.
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                      
                      {/* Additional Details */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {selectedProperty.built_area && (
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Área Construida</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ConstructionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {selectedProperty.built_area} m²
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        
                        {selectedProperty.floors && (
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Pisos</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {selectedProperty.floors} {selectedProperty.floors === 1 ? 'piso' : 'pisos'}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        
                        {selectedProperty.floor_number && (
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Piso #</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              Piso {selectedProperty.floor_number}
                            </Typography>
                          </Grid>
                        )}
                        
                        {selectedProperty.year_built && (
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Año de Construcción</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {selectedProperty.year_built}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        
                        {selectedProperty.half_bathrooms > 0 && (
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Medios Baños</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <WcIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {selectedProperty.half_bathrooms}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                      
                      {/* Financial Information */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {selectedProperty.rent_price && (
                          <Grid item xs={12} sm={6} md={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                              <Typography variant="caption" color="success.dark">Precio de Renta</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                                <MoneyIcon sx={{ fontSize: 20 }} />
                                <Typography variant="h6" fontWeight="bold">
                                  ${Number(selectedProperty.rent_price).toLocaleString()} COP/mes
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        )}
                        
                        {selectedProperty.security_deposit && (
                          <Grid item xs={12} sm={6} md={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                              <Typography variant="caption" color="info.dark">Depósito de Garantía</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                                <BankIcon sx={{ fontSize: 20 }} />
                                <Typography variant="h6" fontWeight="bold">
                                  ${Number(selectedProperty.security_deposit).toLocaleString()} COP
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        )}
                        
                        {selectedProperty.maintenance_fee && (
                          <Grid item xs={12} sm={6} md={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                              <Typography variant="caption" color="warning.dark">Administración</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                                <BusinessIcon sx={{ fontSize: 20 }} />
                                <Typography variant="h6" fontWeight="bold">
                                  ${Number(selectedProperty.maintenance_fee).toLocaleString()} COP/mes
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                      
                      {/* Property Policies & Features */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>Políticas de la Propiedad</Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {selectedProperty.furnished && (
                              <Chip icon={<ChairIcon />} label="Amoblado" size="small" color="info" />
                            )}
                            {selectedProperty.pets_allowed && (
                              <Chip icon={<PetsIcon />} label="Mascotas Permitidas" size="small" color="success" />
                            )}
                            {selectedProperty.smoking_allowed && (
                              <Chip icon={<SmokingRoomsIcon />} label="Fumadores Permitidos" size="small" color="warning" />
                            )}
                            {selectedProperty.minimum_lease_term && (
                              <Chip label={`Mín. ${selectedProperty.minimum_lease_term} meses`} size="small" color="primary" />
                            )}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>Servicios Incluidos</Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {(Array.isArray(selectedProperty.utilities_included) ? selectedProperty.utilities_included : [])?.map((utility: string, index: number) => (
                              <Chip key={index} label={utility} size="small" color="secondary" />
                            )) || <Typography variant="caption" color="text.secondary">No especificados</Typography>}
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {/* Property Features */}
                      {selectedProperty.property_features && selectedProperty.property_features.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>Características Especiales</Typography>
                          <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                            {selectedProperty.property_features.slice(0, 6).map((feature: string, index: number) => (
                              <Chip key={index} icon={<SparkleIcon />} label={feature} size="small" variant="outlined" />
                            ))}
                            {selectedProperty.property_features.length > 6 && (
                              <Chip label={`+${selectedProperty.property_features.length - 6} más`} size="small" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      )}
                      
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Datos Auto-Cargados:</strong> Toda la información de esta propiedad ha sido transferida automáticamente 
                          al formulario del contrato. Verifica los datos en los campos de abajo y modifica lo que sea necesario antes de continuar.
                        </Typography>
                      </Alert>
                    </Card>
                  );
                })()}
              </Grid>
            )}
            
            {/* Property Selector */}
            {!effectivePropertyId && (
              <Grid item xs={12}>
                <FormControl fullWidth error={validationErrors.some(err => err.includes('seleccionar una propiedad'))}>
                  <InputLabel id="property-select-label">Seleccionar Propiedad *</InputLabel>
                  <Select
                    labelId="property-select-label"
                    value={propertyData.property_id}
                    label="Seleccionar Propiedad *"
                    onChange={(e) => handlePropertySelect(e.target.value as string)}
                    disabled={propertiesLoading}
                  >
                    {propertiesLoading ? (
                      <MenuItem disabled>Cargando propiedades...</MenuItem>
                    ) : properties.length === 0 ? (
                      <MenuItem disabled>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            No hay propiedades disponibles
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Asegúrate de tener propiedades activas y no arrendadas
                          </Typography>
                        </Box>
                      </MenuItem>
                    ) : (
                      properties.map((property) => (
                        <MenuItem key={property.id} value={property.id}>
                          <Box>
                            <Typography variant="subtitle2">
                              {property.title || `${property.property_type} - ${property.area}m²`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {property.address}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {validationErrors.some(err => err.includes('seleccionar una propiedad')) && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      Debe seleccionar una propiedad para continuar
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}
            
            {propertyData.property_id && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CheckIcon fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold">Propiedad seleccionada:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {propertyData.property_address}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {propertyData.property_area}m² · {propertyData.property_rooms} hab. · {propertyData.property_bathrooms} baños
                    {propertyData.property_parking_spaces > 0 && ` · ${propertyData.property_parking_spaces} parqueaderos`}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección Completa de la Propiedad *"
                value={propertyData.property_address}
                onChange={(e) => setPropertyData(prev => ({ ...prev, property_address: e.target.value }))}
                error={validationErrors.some(err => err.includes('dirección de la propiedad'))}
                helperText={effectivePropertyId ? 'Auto-llenado desde la propiedad seleccionada. Puedes editarlo si es necesario.' : 'Dirección exacta incluida nomenclatura y referencias'}
                InputProps={{
                  startAdornment: effectivePropertyId ? (
                    <InputAdornment position="start">
                      <CheckIcon color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={effectivePropertyId ? { 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'success.50',
                    '&:hover': { bgcolor: 'success.100' },
                    '&.Mui-focused': { bgcolor: 'background.paper' },
                  }, 
                } : undefined}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={effectivePropertyId ? { 
                '& .MuiOutlinedInput-root': { 
                  bgcolor: 'success.50',
                  '&:hover': { bgcolor: 'success.100' },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                }, 
              } : undefined}>
                <InputLabel>Tipo de Propiedad *</InputLabel>
                <Select
                  value={contractData.property_type}
                  onChange={(e) => setContractData(prev => ({ ...prev, property_type: e.target.value as PropertyType }))}
                  label={'Tipo de Propiedad *'}
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
                {effectivePropertyId && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1.5 }}>
                    Auto-llenado desde la propiedad
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Área (m²) *"
                type="number"
                value={propertyData.property_area === 0 ? '' : propertyData.property_area}
                onChange={(e) => setPropertyData(prev => ({ 
                  ...prev, 
                  property_area: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
                error={validationErrors.some(err => err.includes('área'))}
                helperText={effectivePropertyId ? 'Auto-llenado desde la propiedad seleccionada' : ''}
                InputProps={{
                  startAdornment: effectivePropertyId ? (
                    <InputAdornment position="start">
                      <CheckIcon color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                  endAdornment: <InputAdornment position="end">m²</InputAdornment>,
                }}
                sx={effectivePropertyId ? { 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'success.50',
                    '&:hover': { bgcolor: 'success.100' },
                    '&.Mui-focused': { bgcolor: 'background.paper' },
                  }, 
                } : undefined}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Estrato"
                type="number"
                value={propertyData.property_stratum === 0 ? '' : propertyData.property_stratum}
                onChange={(e) => setPropertyData(prev => ({ 
                  ...prev, 
                  property_stratum: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
                inputProps={{ min: 1, max: 6 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Habitaciones"
                type="number"
                value={propertyData.property_rooms === 0 ? '' : propertyData.property_rooms}
                onChange={(e) => setPropertyData(prev => ({ 
                  ...prev, 
                  property_rooms: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
                inputProps={{ min: 0 }}
                helperText={effectivePropertyId ? 'Auto-llenado desde la propiedad' : ''}
                InputProps={{
                  startAdornment: effectivePropertyId ? (
                    <InputAdornment position="start">
                      <CheckIcon color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={effectivePropertyId ? { 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'success.50',
                    '&:hover': { bgcolor: 'success.100' },
                    '&.Mui-focused': { bgcolor: 'background.paper' },
                  }, 
                } : undefined}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Baños"
                type="number"
                value={propertyData.property_bathrooms === 0 ? '' : propertyData.property_bathrooms}
                onChange={(e) => setPropertyData(prev => ({ 
                  ...prev, 
                  property_bathrooms: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
                inputProps={{ min: 0 }}
                helperText={effectivePropertyId ? 'Auto-llenado desde la propiedad' : ''}
                InputProps={{
                  startAdornment: effectivePropertyId ? (
                    <InputAdornment position="start">
                      <CheckIcon color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={effectivePropertyId ? { 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'success.50',
                    '&:hover': { bgcolor: 'success.100' },
                    '&.Mui-focused': { bgcolor: 'background.paper' },
                  }, 
                } : undefined}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Parqueaderos"
                type="number"
                value={propertyData.property_parking_spaces === 0 ? '' : propertyData.property_parking_spaces}
                onChange={(e) => setPropertyData(prev => ({ 
                  ...prev, 
                  property_parking_spaces: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
                inputProps={{ min: 0 }}
                helperText={effectivePropertyId ? 'Auto-llenado desde la propiedad' : ''}
                InputProps={{
                  startAdornment: effectivePropertyId ? (
                    <InputAdornment position="start">
                      <CheckIcon color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={effectivePropertyId ? { 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'success.50',
                    '&:hover': { bgcolor: 'success.100' },
                    '&.Mui-focused': { bgcolor: 'background.paper' },
                  }, 
                } : undefined}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={propertyData.property_furnished}
                      onChange={(e) => setPropertyData(prev => ({ ...prev, property_furnished: e.target.checked }))}
                      color={effectivePropertyId ? 'success' : 'primary'}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      {effectivePropertyId && <CheckIcon color="success" fontSize="small" />}
                      <Typography>Propiedad Amoblada</Typography>
                    </Box>
                  }
                />
                {effectivePropertyId && (
                  <Typography variant="caption" color="success.main" display="block">
                    Auto-llenado desde la propiedad
                  </Typography>
                )}
              </Box>
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
                          '&:hover': { borderColor: 'primary.main' },
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

      case 3: // Condiciones Económicas
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
                value={contractData.monthly_rent === 0 ? '' : contractData.monthly_rent}
                onChange={(e) => setContractData(prev => ({ 
                  ...prev, 
                  monthly_rent: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
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
                value={contractData.security_deposit === 0 ? '' : contractData.security_deposit}
                onChange={(e) => setContractData(prev => ({ 
                  ...prev, 
                  security_deposit: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
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
                value={contractData.contract_duration_months === 0 ? '' : contractData.contract_duration_months}
                onChange={(e) => setContractData(prev => ({ 
                  ...prev, 
                  contract_duration_months: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
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
                value={contractData.payment_day === 0 ? '' : contractData.payment_day}
                onChange={(e) => setContractData(prev => ({ 
                  ...prev, 
                  payment_day: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
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

      case 4: // Términos del Contrato
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
                value={contractData.max_occupants === 0 ? '' : contractData.max_occupants}
                onChange={(e) => setContractData(prev => ({ 
                  ...prev, 
                  max_occupants: e.target.value === '' ? 0 : Number(e.target.value), 
                }))}
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

      case 5: // Garantías del Contrato
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Garantías del Contrato
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Selecciona el tipo de garantía requerida para este contrato de arrendamiento
              </Typography>
            </Grid>

            {/* Guarantee Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Garantía</InputLabel>
                <Select
                  value={guaranteeData.guarantee_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'none' | 'codeudor_salario' | 'codeudor_finca_raiz';
                    const requiresBiometric = newType !== 'none';
                    
                    setGuaranteeData(prev => ({ 
                      ...prev, 
                      guarantee_type: newType,
                      requires_biometric_codeudor: requiresBiometric,
                    }));
                    
                    // Update codeudor biometric requirement state
                    setRequiresCodeudorBiometric(requiresBiometric);
                    
                  }}
                  label="Tipo de Garantía"
                >
                  <MenuItem value="none">Sin Garantía</MenuItem>
                  <MenuItem value="codeudor_salario">Codeudor con Salario (Garantía Personal)</MenuItem>
                  <MenuItem value="codeudor_finca_raiz">Codeudor con Finca Raíz (Garantía Real)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Codeudor Fields - Common for both types */}
            {guaranteeData.guarantee_type !== 'none' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Información del Codeudor
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      El codeudor deberá completar proceso biométrico durante la firma del contrato
                    </Typography>
                  </Alert>
                  
                  {/* Biometric Process Button */}
                  {guaranteeData.codeudor_full_name && guaranteeData.codeudor_document_number && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<SecurityIcon />}
                        onClick={() => setCodeudorBiometricOpen(true)}
                        disabled={!requiresCodeudorBiometric}
                        color="secondary"
                      >
                        Iniciar Verificación Biométrica del Codeudor
                      </Button>
                      {codeudorBiometricData && (
                        <Chip
                          icon={<CheckIcon />}
                          label="Verificación Biométrica Completada"
                          color="success"
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre Completo del Codeudor *"
                    value={guaranteeData.codeudor_full_name}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_full_name: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Documento</InputLabel>
                    <Select
                      value={guaranteeData.codeudor_document_type}
                      onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_document_type: e.target.value as 'CC' | 'CE' | 'TI' | 'NIT' }))}
                      label="Tipo de Documento"
                    >
                      <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                      <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                      <MenuItem value="TI">Tarjeta de Identidad</MenuItem>
                      <MenuItem value="NIT">NIT</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Número de Documento *"
                    value={guaranteeData.codeudor_document_number}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_document_number: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono del Codeudor *"
                    value={guaranteeData.codeudor_phone}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_phone: e.target.value }))}
                    placeholder="+57 300 123 4567"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email del Codeudor *"
                    type="email"
                    value={guaranteeData.codeudor_email}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_email: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección del Codeudor *"
                    value={guaranteeData.codeudor_address}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_address: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ciudad *"
                    value={guaranteeData.codeudor_city}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_city: e.target.value }))}
                  />
                </Grid>
              </>
            )}

            {/* Codeudor Salario - Additional Fields */}
            {guaranteeData.guarantee_type === 'codeudor_salario' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Información Laboral
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Empresa donde Trabaja *"
                    value={guaranteeData.codeudor_employer}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_employer: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cargo/Posición *"
                    value={guaranteeData.codeudor_position}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_position: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ingresos Mensuales *"
                    type="number"
                    value={guaranteeData.codeudor_monthly_income === 0 ? '' : guaranteeData.codeudor_monthly_income}
                    onChange={(e) => setGuaranteeData(prev => ({ 
                      ...prev, 
                      codeudor_monthly_income: e.target.value === '' ? 0 : Number(e.target.value), 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono de la Empresa"
                    value={guaranteeData.codeudor_work_phone}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, codeudor_work_phone: e.target.value }))}
                  />
                </Grid>
              </>
            )}

            {/* Codeudor Finca Raíz - Additional Fields */}
            {guaranteeData.guarantee_type === 'codeudor_finca_raiz' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Información del Inmueble de Garantía
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Se requerirá certificado de libertad y tradición del inmueble
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Matrícula Inmobiliaria *"
                    value={guaranteeData.property_matricula}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_matricula: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Área del Inmueble (m²) *"
                    type="number"
                    value={guaranteeData.property_area_guarantee === 0 ? '' : guaranteeData.property_area_guarantee}
                    onChange={(e) => setGuaranteeData(prev => ({ 
                      ...prev, 
                      property_area_guarantee: e.target.value === '' ? 0 : Number(e.target.value), 
                    }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección Completa del Inmueble *"
                    value={guaranteeData.property_address_guarantee}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_address_guarantee: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número Predial *"
                    value={guaranteeData.property_predial_number}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_predial_number: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número Catastral *"
                    value={guaranteeData.property_catastral_number}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_catastral_number: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Departamento *"
                    value={guaranteeData.property_department_guarantee}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_department_guarantee: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ciudad *"
                    value={guaranteeData.property_city_guarantee}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_city_guarantee: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Linderos *"
                    multiline
                    rows={3}
                    value={guaranteeData.property_linderos}
                    onChange={(e) => setGuaranteeData(prev => ({ ...prev, property_linderos: e.target.value }))}
                    helperText="Descripción detallada de los linderos del inmueble"
                    placeholder="Por el Norte con..., por el Sur con..., por el Oriente con..., por el Occidente con..."
                  />
                </Grid>
              </>
            )}

            {/* Nota: Los documentos de garantía ahora se suben en el perfil del arrendatario */}

            {/* Summary */}
            {guaranteeData.guarantee_type !== 'none' && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Garantía Configurada
                  </Typography>
                  <Typography variant="body2">
                    Tipo: {guaranteeData.guarantee_type === 'codeudor_salario' ? 'Codeudor con Salario' : 'Codeudor con Finca Raíz'}
                    <br />
                    Codeudor: {guaranteeData.codeudor_full_name} ({guaranteeData.codeudor_document_type} {guaranteeData.codeudor_document_number})
                    <br />
                    Documentos: {(guaranteeData as any).documents_uploaded || 0} de {(guaranteeData as any).documents_total || 0} subidos
                    <br />
                    El codeudor deberá completar el proceso biométrico al momento de la firma del contrato.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 6: // Cláusulas Especiales
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
                  Template Incluido Automáticamente
                </Typography>
                <Typography variant="body2">
                  El contrato incluirá automáticamente todas las cláusulas estándar del template seleccionado, 
                  más cualquier cláusula adicional que agregues aquí. El contenido completo se generará al crear el contrato.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 7: // Revisión y Creación
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
                  Resumen del Contrato
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
                <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RocketIcon />
                  Próximos Pasos
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
          <Stepper
            activeStep={activeStep}
            orientation="vertical"
            sx={{
              '& .MuiStepLabel-root .Mui-active': { color: vhColors.accentBlue },
              '& .MuiStepLabel-root .Mui-completed': { color: vhColors.success },
              '& .MuiStepIcon-root.Mui-active': { color: vhColors.accentBlue },
              '& .MuiStepIcon-root.Mui-completed': { color: vhColors.success },
            }}
          >
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="subtitle1" fontWeight={activeStep === index ? 700 : 500}>
                    {label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  {renderStepContent(index)}
                  <Box sx={{ mb: 2, mt: 4 }}>
                    {/* Botón de previsualización solo en el paso final */}
                    {index === steps.length - 1 && (
                      <LoadingButton
                        variant="outlined"
                        color="info"
                        onClick={handleContractPreview}
                        loading={loading}
                        sx={{ mr: 1 }}
                        size="large"
                        startIcon={<VisibilityIcon />}
                      >
                        Previsualizar Contrato
                      </LoadingButton>
                    )}
                    <LoadingButton
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      loading={loading}
                      sx={{
                        mr: 1,
                        ...(index === steps.length - 1 && {
                          background: `linear-gradient(135deg, ${vhColors.accentBlue} 0%, ${vhColors.purple} 100%)`,
                          '&:hover': {
                            background: `linear-gradient(135deg, ${vhColors.accentBlue} 20%, ${vhColors.purple} 100%)`,
                          },
                        }),
                      }}
                      size="large"
                    >
                      {index === steps.length - 1 ? 'Crear Borrador' : 'Continuar'}
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

      {/* Contract Preview Dialog - Editable Draft */}
      <Dialog
        open={contractPreviewMode}
        onClose={() => setContractPreviewMode(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <VisibilityIcon color="primary" />
              <Typography variant="h6">
                Borrador del Contrato - {PROFESSIONAL_CONTRACT_TEMPLATES[selectedTemplate].title}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip label="BORRADOR EDITABLE" color="warning" size="small" />
              <IconButton onClick={() => setContractPreviewMode(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 18 }} />
              Editor de Borrador del Contrato
            </Typography>
            <Typography variant="body2">
              Puede editar el contenido del contrato directamente aquí. Los cambios se aplicarán al momento de crear el contrato.
              Este borrador se generará oficialmente una vez que haga clic en "Crear Contrato".
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            multiline
            value={contractDraftContent}
            onChange={(e) => setContractDraftContent(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiInputBase-root': {
                minHeight: 'calc(90vh - 200px)',
                alignItems: 'flex-start',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
              },
              '& .MuiInputBase-input': {
                padding: '20px',
                minHeight: 'calc(90vh - 240px) !important',
              },
            }}
            placeholder="El contenido del contrato aparecerá aquí una vez que complete todos los campos requeridos..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" width="100%">
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <LightbulbIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">
                  Tip: Use formato Markdown para mejor presentación
                </Typography>
              </Box>
            </Box>
            <Box>
              <Button 
                onClick={() => setContractPreviewMode(false)}
                color="inherit"
                sx={{ mr: 1 }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveContractChanges}
                variant="contained"
                startIcon={<SaveIcon />}
                color="primary"
              >
                Guardar Cambios
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Template Preview Dialog */}
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

      {/* Codeudor Biometric Flow Dialog */}
      {requiresCodeudorBiometric && guaranteeData.guarantee_type !== 'none' && (
        <CodeudorBiometricFlow
          open={codeudorBiometricOpen}
          onClose={handleCodeudorBiometricClose}
          contractId={contractId || ''}
          codeudorData={{
            full_name: guaranteeData.codeudor_full_name,
            document_type: guaranteeData.codeudor_document_type,
            document_number: guaranteeData.codeudor_document_number,
            email: guaranteeData.codeudor_email,
            phone: guaranteeData.codeudor_phone,
            guarantee_type: guaranteeData.guarantee_type,
          }}
          onSuccess={handleCodeudorBiometricSuccess}
          onError={handleCodeudorBiometricError}
        />
      )}
      <ConfirmDialog />
    </Box>
  );
};

export default LandlordContractForm;

/* PAYLOAD FIX 1754467945892 - PROPERTY ID INITIALIZATION - Fixed property_id missing in propertyData */
/* FORCE RELOAD 1754456937847 - LANDLORD_CONTRACT_FORM - Nuclear fix applied */
