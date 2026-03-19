/**
 * MaintenanceRequestForm - Formulario para solicitudes de mantenimiento
 * Permite a los arrendatarios crear solicitudes de mantenimiento para sus propiedades
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Warning as EmergencyIcon,
  Build as RepairIcon,
  EventRepeat as RoutineIcon,
  Shield as PreventiveIcon,
  TrendingUp as ImprovementIcon,
  Close as CloseIcon,
  Send as SendIcon,
  PhotoCamera as PhotoIcon,
  Home as HomeIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useProperties } from '../../hooks/useProperties';
import { requestService, CreateMaintenanceRequestData } from '../../services/requestService';
import UniversalFileUpload from '../common/UniversalFileUpload';

interface FileData {
  file: File;
  id: string;
  preview?: string;
  type: 'image' | 'video' | 'document' | 'archive' | 'audio' | 'text' | 'other';
  size: string;
  uploaded?: boolean;
}

const MAINTENANCE_TYPES = [
  { value: 'emergency', label: 'Emergencia', icon: <EmergencyIcon />, color: '#d32f2f', description: 'Problemas urgentes que requieren atenci\u00f3n inmediata' },
  { value: 'routine', label: 'Rutinario', icon: <RoutineIcon />, color: '#1976d2', description: 'Mantenimiento regular programado' },
  { value: 'preventive', label: 'Preventivo', icon: <PreventiveIcon />, color: '#388e3c', description: 'Prevenci\u00f3n de problemas futuros' },
  { value: 'repair', label: 'Reparaci\u00f3n', icon: <RepairIcon />, color: '#f57c00', description: 'Reparaci\u00f3n de da\u00f1os existentes' },
  { value: 'improvement', label: 'Mejora', icon: <ImprovementIcon />, color: '#7b1fa2', description: 'Mejoras o actualizaciones del inmueble' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgente', color: 'error' as const },
  { value: 'high', label: 'Alta', color: 'warning' as const },
  { value: 'medium', label: 'Media', color: 'primary' as const },
  { value: 'low', label: 'Baja', color: 'default' as const },
];

const AFFECTED_AREAS = [
  'Ba\u00f1o', 'Cocina', 'Sala', 'Habitaci\u00f3n principal', 'Habitaci\u00f3n secundaria',
  'Comedor', 'Balc\u00f3n', 'Terraza', 'Garaje', 'Jard\u00edn',
  '\u00c1rea com\u00fan', 'Fachada', 'Techo', 'Pisos', 'Paredes',
  'Sistema el\u00e9ctrico', 'Sistema hidr\u00e1ulico', 'Ventanas', 'Puertas', 'Otro',
];

interface MaintenanceRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MaintenanceRequestForm: React.FC<MaintenanceRequestFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { properties, isLoading: loadingProperties } = useProperties();

  const [formData, setFormData] = useState({
    property: '',
    maintenance_type: '',
    affected_area: '',
    title: '',
    description: '',
    issue_description: '',
    access_instructions: '',
    requires_tenant_presence: false,
    estimated_duration_hours: '',
    priority: 'medium',
    assignee: '',
  });

  const [photos, setPhotos] = useState<FileData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handlePhotosChange = useCallback((newFiles: FileData[]) => {
    setPhotos(newFiles);
  }, []);

  const validateForm = (): string | null => {
    if (!formData.property) return 'Selecciona una propiedad';
    if (!formData.maintenance_type) return 'Selecciona el tipo de mantenimiento';
    if (!formData.affected_area) return '\u00c1rea afectada es requerida';
    if (!formData.title.trim()) return 'T\u00edtulo es requerido';
    if (!formData.issue_description.trim()) return 'Descripci\u00f3n del problema es requerida';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateMaintenanceRequestData = {
        property: formData.property,
        assignee: formData.assignee || formData.property,
        title: formData.title,
        description: formData.description || formData.issue_description,
        maintenance_type: formData.maintenance_type,
        affected_area: formData.affected_area,
        issue_description: formData.issue_description,
        access_instructions: formData.access_instructions || undefined,
        requires_tenant_presence: formData.requires_tenant_presence,
        estimated_duration_hours: formData.estimated_duration_hours
          ? parseFloat(formData.estimated_duration_hours)
          : undefined,
        priority: formData.priority,
      };

      if (photos.length > 0) {
        const formDataPayload = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formDataPayload.append(key, String(value));
          }
        });
        photos.forEach((photo) => {
          formDataPayload.append('photos', photo.file);
        });
        await requestService.createMaintenanceRequest(formDataPayload);
      } else {
        await requestService.createMaintenanceRequest(payload);
      }
      setSuccess(true);

      setTimeout(() => {
        resetForm();
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      const message = err?.response?.data?.detail
        || err?.response?.data?.message
        || 'Error al crear la solicitud. Int\u00e9ntalo nuevamente.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      property: '',
      maintenance_type: '',
      affected_area: '',
      title: '',
      description: '',
      issue_description: '',
      access_instructions: '',
      requires_tenant_presence: false,
      estimated_duration_hours: '',
      priority: 'medium',
      assignee: '',
    });
    setPhotos([]);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const selectedType = MAINTENANCE_TYPES.find(t => t.value === formData.maintenance_type);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'white',
          py: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <RepairIcon />
          <Typography variant="h6" component="span">
            Nueva Solicitud de Mantenimiento
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={submitting} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 1 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Solicitud creada exitosamente. Ser\u00e1s notificado cuando sea atendida.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Selector de propiedad */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Propiedad</InputLabel>
              <Select
                value={formData.property}
                onChange={(e) => handleChange('property', e.target.value)}
                label="Propiedad"
                disabled={submitting || loadingProperties}
                startAdornment={<HomeIcon sx={{ mr: 1, color: 'action.active' }} />}
              >
                {loadingProperties ? (
                  <MenuItem disabled>Cargando propiedades...</MenuItem>
                ) : properties && (properties as any[]).length > 0 ? (
                  (properties as any[]).map((property: any) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.title || property.address || `Propiedad ${property.id}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No hay propiedades disponibles</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Tipo de mantenimiento */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
              Tipo de Mantenimiento *
            </Typography>
            <Grid container spacing={1.5}>
              {MAINTENANCE_TYPES.map((type) => (
                <Grid item xs={6} sm={4} md={2.4} key={type.value}>
                  <Paper
                    elevation={formData.maintenance_type === type.value ? 4 : 1}
                    onClick={() => !submitting && handleChange('maintenance_type', type.value)}
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      border: 2,
                      borderColor: formData.maintenance_type === type.value ? type.color : 'transparent',
                      bgcolor: formData.maintenance_type === type.value ? `${type.color}10` : 'background.paper',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: submitting ? 'transparent' : type.color,
                        transform: submitting ? 'none' : 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ color: type.color, mb: 0.5 }}>{type.icon}</Box>
                    <Typography variant="caption" display="block" fontWeight={600}>
                      {type.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {selectedType && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selectedType.description}
              </Typography>
            )}
          </Grid>

          {/* T\u00edtulo */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="T\u00edtulo de la solicitud"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej: Fuga de agua en ba\u00f1o principal"
              disabled={submitting}
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          {/* \u00c1rea afectada y prioridad */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>\u00c1rea Afectada</InputLabel>
              <Select
                value={formData.affected_area}
                onChange={(e) => handleChange('affected_area', e.target.value)}
                label="\u00c1rea Afectada"
                disabled={submitting}
              >
                {AFFECTED_AREAS.map((area) => (
                  <MenuItem key={area} value={area}>{area}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                label="Prioridad"
                disabled={submitting}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={opt.label} size="small" color={opt.color} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Descripci\u00f3n del problema */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={4}
              label="Descripci\u00f3n del problema"
              value={formData.issue_description}
              onChange={(e) => handleChange('issue_description', e.target.value)}
              placeholder="Describe detalladamente el problema que est\u00e1s experimentando..."
              disabled={submitting}
              InputProps={{
                startAdornment: (
                  <DescriptionIcon sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 1 }} />
                ),
              }}
              inputProps={{ maxLength: 2000 }}
              helperText={`${formData.issue_description.length}/2000 caracteres`}
            />
          </Grid>

          {/* Fotos */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>
              <Chip icon={<PhotoIcon />} label="Fotos del problema" variant="outlined" />
            </Divider>
            <UniversalFileUpload
              files={photos}
              onFilesChange={handlePhotosChange}
              maxFiles={10}
              acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
              label="Subir Fotos del Problema"
              helperText="Arrastra fotos aqu\u00ed o haz clic para seleccionar (m\u00e1x. 10)"
              disabled={submitting}
            />
          </Grid>

          {/* Instrucciones de acceso */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Instrucciones de acceso"
              value={formData.access_instructions}
              onChange={(e) => handleChange('access_instructions', e.target.value)}
              placeholder="Ej: Llamar al timbre del apartamento 301, disponible de 8am a 6pm"
              disabled={submitting}
              helperText="Indica c\u00f3mo puede acceder el t\u00e9cnico a la propiedad"
            />
          </Grid>

          {/* Duraci\u00f3n estimada y presencia */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Duraci\u00f3n estimada (horas)"
              value={formData.estimated_duration_hours}
              onChange={(e) => handleChange('estimated_duration_hours', e.target.value)}
              placeholder="Ej: 2"
              disabled={submitting}
              inputProps={{ min: 0.5, max: 100, step: 0.5 }}
              helperText="Opcional - estimaci\u00f3n de tiempo de reparaci\u00f3n"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requires_tenant_presence}
                    onChange={(e) => handleChange('requires_tenant_presence', e.target.checked)}
                    disabled={submitting}
                    color="primary"
                  />
                }
                label="Requiero estar presente durante la reparaci\u00f3n"
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: { xs: 2, md: 3 }, pt: 0, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={submitting}
          variant="outlined"
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || success}
          variant="contained"
          color="primary"
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          sx={{ minWidth: 180 }}
        >
          {submitting ? 'Enviando...' : 'Enviar Solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaintenanceRequestForm;
