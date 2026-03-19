/**
 * ContractRenewalWizard - Wizard multi-paso para renovar contratos
 *
 * Flujo:
 * 1. Seleccionar contrato a renovar (o recibir contractId como prop)
 * 2. Revisar términos actuales del contrato
 * 3. Configurar nuevos términos (duración, renta con ajuste IPC)
 * 4. Confirmar y crear renovación
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Slider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Autorenew as RenewIcon,
  TrendingUp as IPCIcon,
  Gavel as LegalIcon,
  CheckCircle as SuccessIcon,
  ArrowBack as BackIcon,
  Home as PropertyIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { contractService } from '../../services/contractService';
import { useAuth } from '../../hooks/useAuth';

interface ContractSummary {
  id: string;
  property_title: string;
  property_address: string;
  tenant_name: string;
  landlord_name: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: string;
  duration_months: number;
  security_deposit: number;
}

interface RenewalTerms {
  new_duration_months: number;
  ipc_rate: number;
  new_monthly_rent: number;
  rent_increase_percentage: number;
  new_start_date: string;
  new_end_date: string;
  additional_terms: string;
  keep_security_deposit: boolean;
}

const steps = [
  'Seleccionar Contrato',
  'Revisar Términos Actuales',
  'Nuevos Términos',
  'Confirmar Renovación',
];

const ContractRenewalWizard: React.FC = () => {
  const navigate = useNavigate();
  const { id: paramContractId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(paramContractId ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState(false);

  // Contract data
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractSummary | null>(null);
  const [contractNotFound, setContractNotFound] = useState(false);

  // Renewal terms
  const [terms, setTerms] = useState<RenewalTerms>({
    new_duration_months: 12,
    ipc_rate: 9.28, // IPC Colombia 2025 approximate
    new_monthly_rent: 0,
    rent_increase_percentage: 0,
    new_start_date: '',
    new_end_date: '',
    additional_terms: '',
    keep_security_deposit: true,
  });

  // Load expiring/active contracts for selection
  useEffect(() => {
    loadContracts();
  }, []);

  // If contractId is provided via URL params, load that contract
  useEffect(() => {
    if (paramContractId && contracts.length > 0) {
      const contract = contracts.find((c) => c.id === paramContractId);
      if (contract) {
        selectContract(contract);
        setContractNotFound(false);
      } else {
        setContractNotFound(true);
        setError(`El contrato ${paramContractId} no fue encontrado o no es elegible para renovación. Solo contratos activos o próximos a vencer pueden renovarse.`);
      }
    } else if (paramContractId && !loading && contracts.length === 0) {
      setContractNotFound(true);
      setError('No se encontraron contratos elegibles para renovación.');
    }
  }, [paramContractId, contracts, loading]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await contractService.getContracts();
      const data = Array.isArray(response) ? response : (response as any)?.results || [];
      const eligible = data
        .filter((c: any) => c.status === 'active' || c.status === 'expiring')
        .map((c: any) => ({
          id: c.id,
          property_title: c.property?.title || c.property_title || 'Propiedad',
          property_address: c.property?.address || c.property_address || '',
          tenant_name: c.secondary_party?.full_name || c.tenant_name || 'Inquilino',
          landlord_name: c.property?.landlord?.full_name || c.landlord_name || '',
          monthly_rent: parseFloat(c.monthly_rent || c.rent_amount || '0'),
          start_date: c.start_date || '',
          end_date: c.end_date || '',
          status: c.status || 'active',
          duration_months: c.duration_months || 12,
          security_deposit: parseFloat(c.security_deposit || '0'),
        }));
      setContracts(eligible);
    } catch {
      setError('Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const selectContract = useCallback(
    (contract: ContractSummary) => {
      setSelectedContract(contract);

      // Calculate new dates
      const endDate = new Date(contract.end_date);
      const newStart = new Date(endDate);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setMonth(newEnd.getMonth() + 12);

      // Calculate IPC-based rent increase
      const ipcRate = terms.ipc_rate;
      const increase = contract.monthly_rent * (ipcRate / 100);
      const newRent = Math.round(contract.monthly_rent + increase);

      setTerms((prev) => ({
        ...prev,
        new_monthly_rent: newRent,
        rent_increase_percentage: ipcRate,
        new_start_date: newStart.toISOString().split('T')[0] ?? '',
        new_end_date: newEnd.toISOString().split('T')[0] ?? '',
      }));

      if (!paramContractId) {
        setActiveStep(1);
      }
    },
    [terms.ipc_rate, paramContractId],
  );

  const handleIPCChange = (rate: number) => {
    if (!selectedContract) return;
    const increase = selectedContract.monthly_rent * (rate / 100);
    const newRent = Math.round(selectedContract.monthly_rent + increase);
    setTerms((prev) => ({
      ...prev,
      ipc_rate: rate,
      rent_increase_percentage: rate,
      new_monthly_rent: newRent,
    }));
  };

  const handleDurationChange = (months: number) => {
    if (!selectedContract) return;
    const newStart = new Date(terms.new_start_date);
    const newEnd = new Date(newStart);
    newEnd.setMonth(newEnd.getMonth() + months);
    setTerms((prev) => ({
      ...prev,
      new_duration_months: months,
      new_end_date: newEnd.toISOString().split('T')[0] ?? '',
    }));
  };

  const handleSubmitRenewal = async () => {
    if (!selectedContract) return;
    try {
      setLoading(true);
      setError(null);
      await contractService.createRenewal({
        contract: selectedContract.id,
        new_end_date: terms.new_end_date,
        new_monthly_rent: terms.new_monthly_rent,
        rent_increase_percentage: terms.rent_increase_percentage,
        new_duration_months: terms.new_duration_months,
        additional_terms: terms.additional_terms,
        keep_security_deposit: terms.keep_security_deposit,
      });
      setSuccessDialog(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.response?.data?.error || 'Error al crear la renovación',
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Step 0: Contract selection
  const renderContractSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Selecciona el contrato a renovar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Solo se muestran contratos activos o por vencer.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {contracts.length === 0 && !loading && (
        <Alert severity="info">No hay contratos elegibles para renovación.</Alert>
      )}

      <Grid container spacing={2}>
        {contracts.map((contract) => {
          const daysLeft = getDaysUntilExpiry(contract.end_date);
          return (
            <Grid item xs={12} md={6} key={contract.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border:
                    selectedContract?.id === contract.id ? '2px solid' : '1px solid transparent',
                  borderColor: selectedContract?.id === contract.id ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.light', boxShadow: 3 },
                  transition: 'all 0.2s',
                }}
                onClick={() => selectContract(contract)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="600">
                      {contract.property_title}
                    </Typography>
                    {daysLeft <= 30 && (
                      <Chip
                        label={`${daysLeft} días`}
                        color={daysLeft <= 15 ? 'error' : 'warning'}
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {contract.property_address}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Inquilino
                      </Typography>
                      <Typography variant="body2">{contract.tenant_name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Renta Mensual
                      </Typography>
                      <Typography variant="body2" fontWeight="500">
                        {formatCurrency(contract.monthly_rent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Vence
                      </Typography>
                      <Typography variant="body2">{formatDate(contract.end_date)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Estado
                      </Typography>
                      <Chip
                        label={contract.status === 'active' ? 'Activo' : 'Por vencer'}
                        color={contract.status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  // Step 1: Review current terms
  const renderCurrentTerms = () => {
    if (!selectedContract) return null;
    const daysLeft = getDaysUntilExpiry(selectedContract.end_date);

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Términos Actuales del Contrato
        </Typography>

        {daysLeft <= 30 && (
          <Alert severity={daysLeft <= 15 ? 'error' : 'warning'} sx={{ mb: 3 }}>
            Este contrato vence en <strong>{daysLeft} días</strong> ({formatDate(selectedContract.end_date)}).
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PropertyIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    Propiedad
                  </Typography>
                </Box>
                <Typography variant="body1">{selectedContract.property_title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedContract.property_address}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <MoneyIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    Condiciones Económicas
                  </Typography>
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Renta Mensual
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(selectedContract.monthly_rent)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Depósito
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(selectedContract.security_deposit)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <CalendarIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    Vigencia
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Inicio
                    </Typography>
                    <Typography variant="body1">{formatDate(selectedContract.start_date)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Fin
                    </Typography>
                    <Typography variant="body1">{formatDate(selectedContract.end_date)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Duración
                    </Typography>
                    <Typography variant="body1">
                      {selectedContract.duration_months} meses
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Step 2: New terms
  const renderNewTerms = () => {
    if (!selectedContract) return null;

    const rentDiff = terms.new_monthly_rent - selectedContract.monthly_rent;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Configurar Nuevos Términos
        </Typography>

        <Alert severity="info" icon={<LegalIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Ley 820 de 2003, Art. 20:</strong> El incremento del canon de arrendamiento no
            puede exceder el IPC (Índice de Precios al Consumidor) del año calendario anterior.
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* IPC Rate */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <IPCIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    Ajuste por IPC
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tasa IPC aplicable (%)
                </Typography>
                <Slider
                  value={terms.ipc_rate}
                  onChange={(_, val) => handleIPCChange(val as number)}
                  min={0}
                  max={15}
                  step={0.01}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v}%`}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 5, label: '5%' },
                    { value: 10, label: '10%' },
                    { value: 15, label: '15%' },
                  ]}
                  sx={{ mt: 4, mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Renta Actual
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(selectedContract.monthly_rent)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Nueva Renta
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(terms.new_monthly_rent)}
                    </Typography>
                  </Grid>
                </Grid>

                <Chip
                  label={`+${formatCurrency(rentDiff)} / mes`}
                  color="info"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Duration */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <CalendarIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    Duración de la Renovación
                  </Typography>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Duración</InputLabel>
                  <Select
                    value={terms.new_duration_months}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    label="Duración"
                  >
                    <MenuItem value={6}>6 meses</MenuItem>
                    <MenuItem value={12}>12 meses (recomendado)</MenuItem>
                    <MenuItem value={18}>18 meses</MenuItem>
                    <MenuItem value={24}>24 meses</MenuItem>
                    <MenuItem value={36}>36 meses</MenuItem>
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Nuevo Inicio
                    </Typography>
                    <Typography variant="body1">{formatDate(terms.new_start_date)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Nuevo Fin
                    </Typography>
                    <Typography variant="body1">{formatDate(terms.new_end_date)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Manual rent override */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Renta Mensual (ajuste manual)"
              type="number"
              value={terms.new_monthly_rent}
              onChange={(e) =>
                setTerms((prev) => ({
                  ...prev,
                  new_monthly_rent: parseFloat(e.target.value) || 0,
                  rent_increase_percentage: selectedContract
                    ? ((parseFloat(e.target.value) - selectedContract.monthly_rent) /
                        selectedContract.monthly_rent) *
                      100
                    : 0,
                }))
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Puede ajustar manualmente pero no debe exceder el IPC legal"
            />
          </Grid>

          {/* Additional terms */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Términos Adicionales"
              multiline
              rows={3}
              value={terms.additional_terms}
              onChange={(e) => setTerms((prev) => ({ ...prev, additional_terms: e.target.value }))}
              placeholder="Condiciones especiales para la renovación..."
            />
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Step 3: Confirmation
  const renderConfirmation = () => {
    if (!selectedContract) return null;

    const rentDiff = terms.new_monthly_rent - selectedContract.monthly_rent;
    const annualDiff = rentDiff * 12;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Confirmar Renovación
        </Typography>

        <Alert severity="success" sx={{ mb: 3 }}>
          Revise los detalles antes de confirmar. Se creará un borrador de renovación que requiere
          aprobación de ambas partes.
        </Alert>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Resumen de la Renovación
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Propiedad
                </Typography>
                <Typography variant="body1">{selectedContract.property_title}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Inquilino
                </Typography>
                <Typography variant="body1">{selectedContract.tenant_name}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Renta Actual
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(selectedContract.monthly_rent)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Nueva Renta
                </Typography>
                <Typography variant="body1" color="primary" fontWeight="bold">
                  {formatCurrency(terms.new_monthly_rent)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Incremento
                </Typography>
                <Chip
                  label={`+${terms.rent_increase_percentage.toFixed(2)}%`}
                  color="info"
                  size="small"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Diferencia Anual
                </Typography>
                <Typography variant="body1" color="success.main">
                  +{formatCurrency(annualDiff)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Nueva Vigencia
                </Typography>
                <Typography variant="body2">
                  {formatDate(terms.new_start_date)} - {formatDate(terms.new_end_date)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Duración
                </Typography>
                <Typography variant="body1">{terms.new_duration_months} meses</Typography>
              </Grid>
              {terms.additional_terms && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Términos Adicionales
                  </Typography>
                  <Typography variant="body2">{terms.additional_terms}</Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Alert severity="info" icon={<LegalIcon />}>
          <Typography variant="body2">
            Al confirmar, se generará un borrador de renovación conforme a la Ley 820 de 2003. Ambas
            partes deberán aprobar los nuevos términos antes de que el contrato renovado entre en
            vigencia.
          </Typography>
        </Alert>
      </Box>
    );
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedContract !== null;
      case 1:
        return selectedContract !== null;
      case 2:
        return terms.new_monthly_rent > 0 && terms.new_duration_months > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmitRenewal();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/app/contracts')}>
          Volver
        </Button>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Renovación de Contrato
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wizard de renovación con ajuste IPC - Ley 820 de 2003
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <Paper sx={{ p: 3, mb: 3, minHeight: 400 }}>
        {activeStep === 0 && renderContractSelection()}
        {activeStep === 1 && renderCurrentTerms()}
        {activeStep === 2 && renderNewTerms()}
        {activeStep === 3 && renderConfirmation()}
      </Paper>

      {/* Navigation */}
      <Box display="flex" justifyContent="space-between">
        <Button
          onClick={() => setActiveStep((prev) => prev - 1)}
          disabled={activeStep === 0 || loading}
        >
          Anterior
        </Button>

        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!canProceed() || loading}
          startIcon={
            loading ? (
              <CircularProgress size={20} />
            ) : activeStep === steps.length - 1 ? (
              <RenewIcon />
            ) : undefined
          }
        >
          {activeStep === steps.length - 1 ? 'Confirmar Renovación' : 'Siguiente'}
        </Button>
      </Box>

      {/* Success Dialog */}
      <Dialog open={successDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SuccessIcon color="success" />
            Renovación Creada Exitosamente
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            El borrador de renovación ha sido creado. Ambas partes serán notificadas para revisar y
            aprobar los nuevos términos.
          </Typography>
          {selectedContract && (
            <Box mt={2}>
              <Chip label={selectedContract.property_title} sx={{ mr: 1 }} />
              <Chip label={formatCurrency(terms.new_monthly_rent)} color="primary" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/app/contracts')}>Ir a Contratos</Button>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              setActiveStep(0);
              setSelectedContract(null);
            }}
          >
            Crear Otra Renovación
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContractRenewalWizard;
