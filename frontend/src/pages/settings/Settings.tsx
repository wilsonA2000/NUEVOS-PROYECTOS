import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { userService } from '../../services/userService';
import { UserSettings } from '../../types/user';
import UserStatusSelector from '../../components/users/UserStatusSelector';
import OptimizedWebSocketStatus from '../../components/common/OptimizedWebSocketStatus';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserSettings>({
    defaultValues: {
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        newsletter: true,
        property_alerts: true,
        message_notifications: true,
        payment_reminders: true,
      },
      privacy: {
        profile_visibility: 'public',
        show_contact_info: true,
        show_property_history: false,
        allow_messages: true,
      },
      preferences: {
        language: 'es',
        timezone: 'America/Bogota',
        currency: 'COP',
        date_format: 'DD/MM/YYYY',
        theme: 'light',
      },
      security: {
        two_factor_enabled: false,
        login_notifications: true,
        session_timeout: 30,
      },
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await userService.getSettings();
      setSettings(settingsData);
      reset(settingsData);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Si no existe, usar valores por defecto
      if (error.response?.status === 404) {
        setSettings(null);
      }
    }
  };

  const onSubmit = async (data: UserSettings) => {
    setIsLoading(true);
    try {
      const updatedSettings = await userService.updateSettings(data);
      setSettings(updatedSettings);
      setSuccessMessage('Ajustes actualizados exitosamente');
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      setSuccessMessage('Error al actualizar los ajustes');
      setShowSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity={successMessage.includes('Error') ? 'error' : 'success'} 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Typography variant="h4" gutterBottom>
        Ajustes
      </Typography>

      {/* User Status & Real-Time Control */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <UserStatusSelector />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon />
              Control de Tiempo Real
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Activa o desactiva las funciones en tiempo real como chat en vivo y notificaciones instantáneas.
            </Typography>
            <OptimizedWebSocketStatus compact={false} showControls={true} />
          </Box>
        </Grid>
      </Grid>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Notificaciones */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon />
                  <Typography variant="h6">Notificaciones</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.email_notifications"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Notificaciones por Email"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.sms_notifications"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Notificaciones por SMS"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.newsletter"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Newsletter"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.property_alerts"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Alertas de Propiedades"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.message_notifications"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Notificaciones de Mensajes"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="notifications.payment_reminders"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Recordatorios de Pagos"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Privacidad */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityIcon />
                  <Typography variant="h6">Privacidad</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="privacy.profile_visibility"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Visibilidad del Perfil</InputLabel>
                          <Select {...field} label="Visibilidad del Perfil">
                            <MenuItem value="public">Público</MenuItem>
                            <MenuItem value="private">Privado</MenuItem>
                            <MenuItem value="contacts_only">Solo Contactos</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="privacy.show_contact_info"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Mostrar Información de Contacto"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="privacy.show_property_history"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Mostrar Historial de Propiedades"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="privacy.allow_messages"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Permitir Mensajes"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Preferencias */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LanguageIcon />
                  <Typography variant="h6">Preferencias</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="preferences.language"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Idioma</InputLabel>
                          <Select {...field} label="Idioma">
                            <MenuItem value="es">Español</MenuItem>
                            <MenuItem value="en">English</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="preferences.timezone"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Zona Horaria</InputLabel>
                          <Select {...field} label="Zona Horaria">
                            <MenuItem value="America/Bogota">Bogotá (GMT-5)</MenuItem>
                            <MenuItem value="America/Mexico_City">Ciudad de México (GMT-6)</MenuItem>
                            <MenuItem value="America/New_York">Nueva York (GMT-5)</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="preferences.currency"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Moneda</InputLabel>
                          <Select {...field} label="Moneda">
                            <MenuItem value="COP">Peso Colombiano (COP)</MenuItem>
                            <MenuItem value="MXN">Peso Mexicano (MXN)</MenuItem>
                            <MenuItem value="USD">Dólar Estadounidense (USD)</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="preferences.theme"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Tema</InputLabel>
                          <Select {...field} label="Tema">
                            <MenuItem value="light">Claro</MenuItem>
                            <MenuItem value="dark">Oscuro</MenuItem>
                            <MenuItem value="auto">Automático</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Seguridad */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon />
                  <Typography variant="h6">Seguridad</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="security.two_factor_enabled"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Autenticación de Dos Factores"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="security.login_notifications"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Notificaciones de Inicio de Sesión"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="security.session_timeout"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Tiempo de Sesión (minutos)"
                          type="number"
                          inputProps={{ min: 5, max: 480 }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isLoading ? 'Guardando...' : 'Guardar Ajustes'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default Settings; 