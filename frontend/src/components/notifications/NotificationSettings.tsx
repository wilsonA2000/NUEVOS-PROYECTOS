/**
 * NotificationSettings - Comprehensive notification preferences management
 * Allows users to configure all notification channels and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Button,
  Grid,
  Alert,
  TextField,
  MenuItem,
  Chip,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TimePicker,
} from '@mui/material';
import { LocalizationProvider, TimePicker as MuiTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  NotificationsActive as PushIcon,
  Computer as InAppIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Campaign as MarketingIcon,
  Message as MessageIcon,
  Payment as PaymentIcon,
  Home as PropertyIcon,
  Assignment as ContractIcon,
  ExpandMore as ExpandMoreIcon,
  TestTube as TestIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { LoadingButton } from '../common';
import { toast } from 'react-toastify';
import { es } from 'date-fns/locale';

const NotificationSettings: React.FC = () => {
  const { state, actions } = useNotificationContext();
  const [localPreferences, setLocalPreferences] = useState(state.preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    setLocalPreferences(state.preferences);
  }, [state.preferences]);

  useEffect(() => {
    setHasChanges(
      JSON.stringify(localPreferences) !== JSON.stringify(state.preferences)
    );
  }, [localPreferences, state.preferences]);

  const handleChannelToggle = (channel: keyof typeof localPreferences) => {
    if (!localPreferences) return;
    
    setLocalPreferences({
      ...localPreferences,
      [channel]: !localPreferences[channel],
    });
  };

  const handleCategoryToggle = (category: keyof typeof localPreferences.categories) => {
    if (!localPreferences?.categories) return;
    
    setLocalPreferences({
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: !localPreferences.categories[category],
      },
    });
  };

  const handleTimeChange = (field: 'quiet_hours_start' | 'quiet_hours_end', value: Date | null) => {
    if (!localPreferences || !value) return;

    const timeString = value.toTimeString().slice(0, 5);
    setLocalPreferences({
      ...localPreferences,
      [field]: timeString,
    });
  };

  const handleSave = async () => {
    if (!localPreferences) return;

    try {
      await actions.updatePreferences(localPreferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleReset = () => {
    setLocalPreferences(state.preferences);
    setHasChanges(false);
  };

  const handleTestNotification = async (channel: string) => {
    setTesting(channel);
    try {
      await actions.testNotification(channel);
    } finally {
      setTesting(null);
    }
  };

  const channels = [
    {
      key: 'email_enabled' as const,
      label: 'Email',
      icon: <EmailIcon />,
      description: 'Receive notifications via email',
      testable: true,
    },
    {
      key: 'sms_enabled' as const,
      label: 'SMS',
      icon: <SmsIcon />,
      description: 'Receive notifications via text message',
      testable: true,
    },
    {
      key: 'push_enabled' as const,
      label: 'Push Notifications',
      icon: <PushIcon />,
      description: 'Browser push notifications',
      testable: true,
    },
    {
      key: 'in_app_enabled' as const,
      label: 'In-App',
      icon: <InAppIcon />,
      description: 'Notifications within the application',
      testable: true,
    },
  ];

  const categories = [
    {
      key: 'system' as const,
      label: 'System',
      icon: <SecurityIcon />,
      description: 'Important system updates and maintenance',
      color: 'error',
    },
    {
      key: 'security' as const,
      label: 'Security',
      icon: <SecurityIcon />,
      description: 'Login alerts and security notifications',
      color: 'warning',
    },
    {
      key: 'messages' as const,
      label: 'Messages',
      icon: <MessageIcon />,
      description: 'New messages and chat notifications',
      color: 'primary',
    },
    {
      key: 'payments' as const,
      label: 'Payments',
      icon: <PaymentIcon />,
      description: 'Payment confirmations and reminders',
      color: 'success',
    },
    {
      key: 'properties' as const,
      label: 'Properties',
      icon: <PropertyIcon />,
      description: 'Property updates and inquiries',
      color: 'info',
    },
    {
      key: 'contracts' as const,
      label: 'Contracts',
      icon: <ContractIcon />,
      description: 'Contract status and document updates',
      color: 'secondary',
    },
    {
      key: 'marketing' as const,
      label: 'Marketing',
      icon: <MarketingIcon />,
      description: 'Promotional content and offers',
      color: 'default',
    },
    {
      key: 'reminders' as const,
      label: 'Reminders',
      icon: <ScheduleIcon />,
      description: 'Scheduled reminders and alerts',
      color: 'default',
    },
  ];

  const timezones = [
    'America/Bogota',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/Madrid',
    'Europe/London',
    'Asia/Tokyo',
  ];

  if (!localPreferences) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Alert severity="info">Loading notification preferences...</Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Configuración de Notificaciones
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Personaliza cómo y cuándo recibes notificaciones en VeriHome.
        </Typography>

        {/* Connection Status */}
        <Alert severity={state.connected ? 'success' : 'warning'} sx={{ mb: 3 }}>
          {state.connected 
            ? 'Conectado - Las notificaciones en tiempo real están activas'
            : 'Desconectado - Las notificaciones pueden estar retrasadas'
          }
        </Alert>

        {/* Notification Channels */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Canales de Notificación
          </Typography>
          
          <Grid container spacing={2}>
            {channels.map((channel) => (
              <Grid item xs={12} sm={6} key={channel.key}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={2}>
                        {channel.icon}
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {channel.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {channel.description}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={1}>
                        {channel.testable && (
                          <IconButton
                            size="small"
                            onClick={() => handleTestNotification(channel.key.replace('_enabled', ''))}
                            disabled={!localPreferences[channel.key] || testing === channel.key}
                            title="Test notification"
                          >
                            <TestIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        <Switch
                          checked={localPreferences[channel.key]}
                          onChange={() => handleChannelToggle(channel.key)}
                          color="primary"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Quiet Hours */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Horario de Silencio
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Durante estas horas no recibirás notificaciones no urgentes.
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <MuiTimePicker
                label="Hora de inicio"
                value={localPreferences.quiet_hours_start ? 
                  new Date(`2000-01-01T${localPreferences.quiet_hours_start}:00`) : null
                }
                onChange={(value) => handleTimeChange('quiet_hours_start', value)}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <MuiTimePicker
                label="Hora de fin"
                value={localPreferences.quiet_hours_end ? 
                  new Date(`2000-01-01T${localPreferences.quiet_hours_end}:00`) : null
                }
                onChange={(value) => handleTimeChange('quiet_hours_end', value)}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Zona horaria"
                value={localPreferences.timezone || 'America/Bogota'}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  timezone: e.target.value,
                })}
              >
                {timezones.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Categories */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Categorías de Notificación
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Elige qué tipos de notificaciones quieres recibir.
          </Typography>

          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.key}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%',
                    border: localPreferences.categories[category.key] ? 2 : 1,
                    borderColor: localPreferences.categories[category.key] 
                      ? `${category.color}.main` 
                      : 'divider',
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {category.icon}
                        <Typography variant="subtitle2" fontWeight="medium">
                          {category.label}
                        </Typography>
                      </Box>
                      
                      <Switch
                        checked={localPreferences.categories[category.key]}
                        onChange={() => handleCategoryToggle(category.key)}
                        color={category.color as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      {category.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Advanced Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Configuración Avanzada</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Límite de frecuencia (por día)"
                  value={localPreferences.frequency_limit || 20}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    frequency_limit: parseInt(e.target.value) || 20,
                  })}
                  helperText="Máximo número de notificaciones por día"
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Actions */}
        <Box display="flex" gap={2} mt={4}>
          <LoadingButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges}
            loading={state.loading}
          >
            Guardar Cambios
          </LoadingButton>
          
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Restablecer
          </Button>
        </Box>

        {hasChanges && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default NotificationSettings;