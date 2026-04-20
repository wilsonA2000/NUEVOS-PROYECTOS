/**
 * ⚙️ ADMIN SETTINGS (Plan Maestro V2.0)
 *
 * Configuración del sistema de administración.
 *
 * Features:
 * - Configurar días de retención de logs
 * - Umbrales de alertas de seguridad
 * - Preferencias de notificación
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Slider,
  Stack,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  DeleteSweep as CleanupIcon,
  Fingerprint as BiometricIcon,
  Gavel as LegalIcon,
} from '@mui/icons-material';

import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Página de configuración
 */
const AdminSettings: React.FC = () => {
  const { isSuperuser } = useAdminAuth();

  // Estado de configuración
  const [settings, setSettings] = useState({
    logRetentionDays: 90,
    securityAlertThreshold: 50,
    emailNotifications: true,
    pushNotifications: true,
    urgentContractDays: 7,
    autoCleanupEnabled: false,
    // Biometric thresholds
    biometricFaceThreshold: 70,
    biometricDocumentThreshold: 70,
    biometricVoiceThreshold: 65,
    biometricOverallThreshold: 70,
    // Contract clause defaults
    defaultContractDurationMonths: 12,
    requireGuarantor: false,
    autoGenerateClauses: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // En producción, guardaría en la API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!isSuperuser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          Solo los superusuarios pueden acceder a la configuración del sistema.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Configuración del Sistema
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Configura los parámetros del sistema de administración.
        </Typography>
      </Box>

      {/* Success alert */}
      {saved && (
        <Alert severity='success' sx={{ mb: 3 }}>
          Configuración guardada exitosamente.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Retención de logs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <StorageIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Retención de Datos
                </Typography>
              </Box>

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Días de retención de logs del sistema
              </Typography>
              <TextField
                type='number'
                value={settings.logRetentionDays}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    logRetentionDays: parseInt(e.target.value) || 30,
                  }))
                }
                fullWidth
                size='small'
                InputProps={{ inputProps: { min: 30, max: 365 } }}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoCleanupEnabled}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        autoCleanupEnabled: e.target.checked,
                      }))
                    }
                  />
                }
                label='Limpieza automática de logs antiguos'
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Alertas de seguridad */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <SecurityIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Alertas de Seguridad
                </Typography>
              </Box>

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Umbral de puntuación de riesgo para alertas (0-100)
              </Typography>
              <Slider
                value={settings.securityAlertThreshold}
                onChange={(_, value) =>
                  setSettings(prev => ({
                    ...prev,
                    securityAlertThreshold: value as number,
                  }))
                }
                valueLabelDisplay='auto'
                min={0}
                max={100}
                marks={[
                  { value: 30, label: 'Bajo' },
                  { value: 50, label: 'Medio' },
                  { value: 70, label: 'Alto' },
                ]}
                sx={{ mb: 2 }}
              />

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Días para marcar contrato como urgente
              </Typography>
              <TextField
                type='number'
                value={settings.urgentContractDays}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    urgentContractDays: parseInt(e.target.value) || 7,
                  }))
                }
                fullWidth
                size='small'
                InputProps={{ inputProps: { min: 1, max: 30 } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notificaciones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <NotificationIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Notificaciones
                </Typography>
              </Box>

              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          emailNotifications: e.target.checked,
                        }))
                      }
                    />
                  }
                  label='Notificaciones por email'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          pushNotifications: e.target.checked,
                        }))
                      }
                    />
                  }
                  label='Notificaciones push en navegador'
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones de mantenimiento */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <CleanupIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Mantenimiento
                </Typography>
              </Box>

              <Typography variant='body2' color='text.secondary' paragraph>
                Ejecuta tareas de mantenimiento del sistema.
              </Typography>

              <Button
                variant='outlined'
                color='warning'
                fullWidth
                startIcon={<CleanupIcon />}
              >
                Limpiar logs antiguos (dry-run)
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {/* Biometric Thresholds */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <BiometricIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Umbrales Biometricos
                </Typography>
              </Box>

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Confianza minima para captura facial (%)
              </Typography>
              <Slider
                value={settings.biometricFaceThreshold}
                onChange={(_, value) =>
                  setSettings(prev => ({
                    ...prev,
                    biometricFaceThreshold: value as number,
                  }))
                }
                valueLabelDisplay='auto'
                min={50}
                max={99}
                sx={{ mb: 2 }}
              />

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Confianza minima para documento (%)
              </Typography>
              <Slider
                value={settings.biometricDocumentThreshold}
                onChange={(_, value) =>
                  setSettings(prev => ({
                    ...prev,
                    biometricDocumentThreshold: value as number,
                  }))
                }
                valueLabelDisplay='auto'
                min={50}
                max={99}
                sx={{ mb: 2 }}
              />

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Confianza minima para voz (%)
              </Typography>
              <Slider
                value={settings.biometricVoiceThreshold}
                onChange={(_, value) =>
                  setSettings(prev => ({
                    ...prev,
                    biometricVoiceThreshold: value as number,
                  }))
                }
                valueLabelDisplay='auto'
                min={50}
                max={99}
                sx={{ mb: 2 }}
              />

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Confianza global minima (%)
              </Typography>
              <Slider
                value={settings.biometricOverallThreshold}
                onChange={(_, value) =>
                  setSettings(prev => ({
                    ...prev,
                    biometricOverallThreshold: value as number,
                  }))
                }
                valueLabelDisplay='auto'
                min={50}
                max={99}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Contract Clause Defaults */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <LegalIcon color='primary' />
                <Typography variant='h6' fontWeight='medium'>
                  Clausulas por Defecto
                </Typography>
              </Box>

              <Typography variant='body2' color='text.secondary' gutterBottom>
                Duracion por defecto del contrato (meses)
              </Typography>
              <TextField
                type='number'
                value={settings.defaultContractDurationMonths}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    defaultContractDurationMonths:
                      parseInt(e.target.value) || 12,
                  }))
                }
                fullWidth
                size='small'
                InputProps={{ inputProps: { min: 1, max: 60 } }}
                sx={{ mb: 2 }}
              />

              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireGuarantor}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          requireGuarantor: e.target.checked,
                        }))
                      }
                    />
                  }
                  label='Requerir codeudor por defecto'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoGenerateClauses}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          autoGenerateClauses: e.target.checked,
                        }))
                      }
                    />
                  }
                  label='Generar clausulas automaticamente (Ley 820)'
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Botón guardar */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='contained'
          size='large'
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Guardar Configuración
        </Button>
      </Box>
    </Box>
  );
};

export default AdminSettings;
