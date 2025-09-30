/**
 * Vista previa interactiva del contrato antes de firma
 * 
 * Permite:
 * - Visualizar el contrato completo con formato legal
 * - Editar campos menores antes de la firma
 * - Navegar por secciones del contrato
 * - Resaltar cambios y términos importantes
 * - Generar PDF final
 * - Transición suave al proceso de firma biométrica
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Grid,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Zoom
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  Security as SignIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Assignment as ContractIcon,
  Person as PersonIcon,
  Home as PropertyIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as DateIcon,
  Gavel as LegalIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Print as PrintIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { contractService } from '../../services/contractService';
import { Contract } from '../../types/contract';
import { DigitalSignatureFlow } from './DigitalSignatureFlow';

interface ContractPreviewProps {
  contractId: string;
  onSigningComplete?: () => void;
  onClose?: () => void;
  initialEditMode?: boolean;
}

interface ContractSection {
  id: string;
  title: string;
  content: string;
  editable: boolean;
  required: boolean;
  category: 'parties' | 'property' | 'financial' | 'legal' | 'terms';
}

interface ContractData extends Contract {
  sections?: ContractSection[];
  lastModified?: string;
  version?: number;
}

const ContractPreview: React.FC<ContractPreviewProps> = ({
  contractId,
  onSigningComplete,
  onClose,
  initialEditMode = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('parties');
  const [showSignatureFlow, setShowSignatureFlow] = useState(false);
  const [previewMode, setPreviewMode] = useState<'sections' | 'full' | 'pdf'>('sections');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Configuración de secciones del contrato
  const contractSections: ContractSection[] = useMemo(() => [
    {
      id: 'parties',
      title: 'PARTES DEL CONTRATO',
      content: `Entre los suscritos a saber: ${contract?.landlord?.first_name || '[ARRENDADOR]'} ${contract?.landlord?.last_name || ''}, mayor de edad, identificado con cédula de ciudadanía número ${contract?.landlord?.document_number || '[CC_ARRENDADOR]'}, quien en adelante se denominará EL ARRENDADOR, y ${contract?.tenant?.first_name || '[ARRENDATARIO]'} ${contract?.tenant?.last_name || ''}, mayor de edad, identificado con cédula de ciudadanía número ${contract?.tenant?.document_number || '[CC_ARRENDATARIO]'}, quien en adelante se denominará EL ARRENDATARIO.`,
      editable: true,
      required: true,
      category: 'parties'
    },
    {
      id: 'property',
      title: 'OBJETO DEL CONTRATO',
      content: `EL ARRENDADOR da en arrendamiento a EL ARRENDATARIO el inmueble ubicado en ${contract?.property?.address || '[DIRECCION_PROPIEDAD]'}, ciudad de ${contract?.property?.city || '[CIUDAD]'}, con las siguientes características: ${contract?.property?.bedrooms || '[X]'} habitaciones, ${contract?.property?.bathrooms || '[X]'} baños, área de ${contract?.property?.total_area || '[X]'} metros cuadrados, estrato ${contract?.property?.floor_number || '[X]'}.`,
      editable: true,
      required: true,
      category: 'property'
    },
    {
      id: 'financial',
      title: 'CANON DE ARRENDAMIENTO Y FORMA DE PAGO',
      content: `El canon mensual de arrendamiento es de ${contract?.monthly_rent ? `$${contract.monthly_rent.toLocaleString('es-CO')} PESOS COLOMBIANOS` : '[VALOR_CANON]'} ($${contract?.monthly_rent || '[VALOR_NUMERICO]'}), que EL ARRENDATARIO se obliga a pagar dentro de los cinco (5) primeros días de cada mes. El depósito de garantía corresponde a ${contract?.security_deposit ? `$${contract.security_deposit.toLocaleString('es-CO')} PESOS COLOMBIANOS` : '[VALOR_DEPOSITO]'}.`,
      editable: true,
      required: true,
      category: 'financial'
    },
    {
      id: 'duration',
      title: 'DURACIÓN DEL CONTRATO',
      content: `El presente contrato tendrá una duración de ${contract?.duration_months || '[X]'} meses, contados a partir del ${contract?.start_date ? format(parseISO(contract.start_date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es }) : '[FECHA_INICIO]'} hasta el ${contract?.end_date ? format(parseISO(contract.end_date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es }) : '[FECHA_FIN]'}.`,
      editable: true,
      required: true,
      category: 'terms'
    },
    {
      id: 'obligations',
      title: 'OBLIGACIONES DE LAS PARTES',
      content: `OBLIGACIONES DEL ARRENDADOR: 1) Entregar el inmueble en buen estado, 2) Realizar las reparaciones necesarias por deterioro normal, 3) Respetar la destinación del inmueble. OBLIGACIONES DEL ARRENDATARIO: 1) Pagar oportunamente el canon de arrendamiento, 2) Usar el inmueble conforme a su destinación, 3) Permitir las inspecciones del arrendador, 4) Restituir el inmueble en las mismas condiciones.`,
      editable: true,
      required: true,
      category: 'legal'
    },
    {
      id: 'clauses',
      title: 'CLÁUSULAS ESPECIALES',
      content: `Se pactan las siguientes cláusulas especiales: ${contract?.special_clauses || '1) El inmueble se entrega amoblado según inventario anexo. 2) No se permite el subarriendo sin autorización previa. 3) Los servicios públicos son por cuenta del arrendatario. 4) Se prohíbe tener mascotas sin autorización.'}`,
      editable: true,
      required: false,
      category: 'legal'
    },
    {
      id: 'termination',
      title: 'TERMINACIÓN DEL CONTRATO',
      content: `El presente contrato podrá darse por terminado por las siguientes causas: 1) Vencimiento del plazo pactado, 2) Incumplimiento en el pago del canon por más de dos (2) meses, 3) Violación de cualquiera de las obligaciones pactadas, 4) Mutuo acuerdo entre las partes. En caso de terminación anticipada por parte del arrendatario, deberá dar aviso con treinta (30) días de anticipación.`,
      editable: true,
      required: true,
      category: 'legal'
    }
  ], [contract]);

  // Cargar datos del contrato
  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const response = await contractService.getContract(contractId);
        setContract({
          ...response,
          sections: contractSections,
          lastModified: new Date().toISOString(),
          version: 1
        });
      } catch (error) {
        console.error('Error loading contract:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId, contractSections]);

  // Manejar cambios en las secciones
  const handleSectionChange = (sectionId: string, newContent: string) => {
    if (!contract) return;
    
    const updatedSections = contract.sections?.map(section =>
      section.id === sectionId ? { ...section, content: newContent } : section
    );
    
    setContract({
      ...contract,
      sections: updatedSections
    });
    setUnsavedChanges(true);
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      
      // Aquí se enviarían los cambios al backend
      await contractService.editContractBeforeAuth(contractId, {
        special_clauses: contract.sections?.find(s => s.id === 'clauses')?.content,
        // Otros campos editables...
      });
      
      setUnsavedChanges(false);
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar PDF
  const handleGeneratePdf = async () => {
    try {
      setLoading(true);
      const response = await contractService.generateContractPdf(contractId);
      
      // Abrir PDF en nueva ventana
      if (response.pdf_url) {
        window.open(response.pdf_url, '_blank');
      } else if (response.pdf_data) {
        const blob = new Blob([response.pdf_data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  // Proceder a firma
  const handleProceedToSign = () => {
    if (unsavedChanges) {
      alert('Debe guardar los cambios antes de proceder a la firma');
      return;
    }
    setShowSignatureFlow(true);
  };

  // Obtener color de categoría
  const getCategoryColor = (category: ContractSection['category']) => {
    const colors = {
      parties: 'primary',
      property: 'success',
      financial: 'warning',
      legal: 'error',
      terms: 'info'
    };
    return colors[category] as 'primary' | 'success' | 'warning' | 'error' | 'info';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="h6" textAlign="center">
          Cargando vista previa del contrato...
        </Typography>
      </Container>
    );
  }

  if (!contract) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          No se pudo cargar el contrato. Por favor, intente nuevamente.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100, py: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PreviewIcon color="primary" />
              Vista Previa del Contrato
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Contrato #{contractId.slice(0, 8)} • Versión {contract.version}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={editMode}
                  onChange={(e) => setEditMode(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Modo Edición"
            />
            
            {onClose && (
              <Button
                variant="outlined"
                onClick={onClose}
                startIcon={<CancelIcon />}
              >
                Cerrar
              </Button>
            )}
          </Box>
        </Box>

        {/* Toolbar */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              size="small"
              onClick={() => setPreviewMode('sections')}
              variant={previewMode === 'sections' ? 'contained' : 'outlined'}
              startIcon={<ContractIcon />}
            >
              Secciones
            </Button>
            <Button
              size="small"
              onClick={() => setPreviewMode('full')}
              variant={previewMode === 'full' ? 'contained' : 'outlined'}
              startIcon={<PreviewIcon />}
            >
              Vista Completa
            </Button>
            <Button
              size="small"
              onClick={handleGeneratePdf}
              startIcon={<PdfIcon />}
              disabled={loading}
            >
              Generar PDF
            </Button>
          </Box>

          <Box display="flex" gap={1}>
            <Tooltip title="Reducir zoom">
              <IconButton
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                size="small"
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </Typography>
            <Tooltip title="Aumentar zoom">
              <IconButton
                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                size="small"
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alertas */}
        {unsavedChanges && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleSaveChanges}>
                Guardar
              </Button>
            }
          >
            Tiene cambios sin guardar en el contrato
          </Alert>
        )}
      </Box>

      {/* Contenido Principal */}
      <Box sx={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', minHeight: '70vh' }}>
        {previewMode === 'sections' && (
          <Grid container spacing={3}>
            {contract.sections?.map((section, index) => (
              <Grid item xs={12} key={section.id}>
                <Accordion
                  expanded={activeSection === section.id}
                  onChange={() => setActiveSection(activeSection === section.id ? '' : section.id)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <Chip
                        label={index + 1}
                        size="small"
                        color={getCategoryColor(section.category)}
                      />
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {section.title}
                      </Typography>
                      {section.required && (
                        <Chip label="Requerido" size="small" color="error" />
                      )}
                      {section.editable && editMode && (
                        <Chip label="Editable" size="small" color="primary" />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {editMode && section.editable ? (
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        value={section.content}
                        onChange={(e) => handleSectionChange(section.id, e.target.value)}
                        variant="outlined"
                      />
                    ) : (
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          textAlign: 'justify',
                          lineHeight: 1.8,
                          fontFamily: 'serif'
                        }}
                      >
                        {section.content}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>
        )}

        {previewMode === 'full' && (
          <Paper sx={{ p: 4, bgcolor: 'white', minHeight: '70vh' }}>
            <Typography variant="h4" textAlign="center" gutterBottom sx={{ fontFamily: 'serif' }}>
              CONTRATO DE ARRENDAMIENTO
            </Typography>
            <Typography variant="h6" textAlign="center" gutterBottom color="text.secondary">
              No. {contractId.slice(0, 8)}
            </Typography>
            
            <Divider sx={{ my: 4 }} />
            
            {contract.sections?.map((section, index) => (
              <Box key={section.id} sx={{ mb: 4 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontFamily: 'serif',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  {index + 1}. {section.title}
                </Typography>
                <Typography 
                  variant="body1" 
                  paragraph 
                  sx={{ 
                    textAlign: 'justify',
                    lineHeight: 1.8,
                    fontFamily: 'serif',
                    pl: 2
                  }}
                >
                  {section.content}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 4 }} />
            
            <Box sx={{ mt: 6 }}>
              <Typography variant="body1" textAlign="center" sx={{ mb: 4 }}>
                En constancia de lo anterior, las partes firman el presente contrato el día{' '}
                {format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}.
              </Typography>
              
              <Grid container spacing={4} sx={{ mt: 4 }}>
                <Grid item xs={12} md={6} textAlign="center">
                  <Box sx={{ borderTop: '1px solid black', pt: 1, mt: 8 }}>
                    <Typography variant="body1" fontWeight="bold">
                      EL ARRENDADOR
                    </Typography>
                    <Typography variant="body2">
                      {contract.landlord?.first_name} {contract.landlord?.last_name}
                    </Typography>
                    <Typography variant="body2">
                      C.C. {contract.landlord?.document_number}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6} textAlign="center">
                  <Box sx={{ borderTop: '1px solid black', pt: 1, mt: 8 }}>
                    <Typography variant="body1" fontWeight="bold">
                      EL ARRENDATARIO
                    </Typography>
                    <Typography variant="body2">
                      {contract.tenant?.first_name} {contract.tenant?.last_name}
                    </Typography>
                    <Typography variant="body2">
                      C.C. {contract.tenant?.document_number}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Actions FAB */}
      {!editMode && (
        <Zoom in timeout={500}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
            onClick={handleProceedToSign}
            disabled={unsavedChanges}
          >
            <SignIcon />
          </Fab>
        </Zoom>
      )}

      {/* Save FAB in Edit Mode */}
      {editMode && unsavedChanges && (
        <Zoom in timeout={500}>
          <Fab
            color="secondary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
            onClick={handleSaveChanges}
            disabled={loading}
          >
            <SaveIcon />
          </Fab>
        </Zoom>
      )}

      {/* Fixed Action Buttons */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          p: 1,
          display: 'flex',
          gap: 1,
          zIndex: 1000,
          boxShadow: theme.shadows[8]
        }}
      >
        {editMode ? (
          <>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              startIcon={<SaveIcon />}
              disabled={!unsavedChanges || loading}
            >
              Guardar Cambios
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setEditMode(false);
                setUnsavedChanges(false);
              }}
              startIcon={<CancelIcon />}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              onClick={handleProceedToSign}
              startIcon={<SignIcon />}
              disabled={unsavedChanges}
            >
              Proceder a Firmar
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowTermsDialog(true)}
              startIcon={<InfoIcon />}
            >
              Términos
            </Button>
          </>
        )}
      </Paper>

      {/* Dialog de Términos */}
      <Dialog
        open={showTermsDialog}
        onClose={() => setShowTermsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Términos y Condiciones Importantes
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
              <ListItemText
                primary="Validez Legal"
                secondary="Este contrato tendrá plena validez legal una vez firmado digitalmente por ambas partes."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
              <ListItemText
                primary="Autenticación Biométrica"
                secondary="La firma digital incluye verificación biométrica para garantizar la identidad de los firmantes."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
              <ListItemText
                primary="Modificaciones"
                secondary="Cualquier modificación posterior al contrato requerirá un nuevo proceso de firma digital."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><LegalIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Jurisdicción"
                secondary="Este contrato se rige por las leyes de la República de Colombia."
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTermsDialog(false)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Flujo de Firma Digital */}
      {showSignatureFlow && (
        <DigitalSignatureFlow
          isOpen={showSignatureFlow}
          contractId={contractId}
          contractTitle={`Contrato de Arrendamiento #${contractId.slice(0, 8)}`}
          signerName={contract.tenant?.first_name || 'Usuario'}
          signerRole="tenant"
          contractData={contract}
          onSigningComplete={() => {
            setShowSignatureFlow(false);
            onSigningComplete?.();
          }}
          onCancel={() => setShowSignatureFlow(false)}
        />
      )}
    </Container>
  );
};

export default ContractPreview;