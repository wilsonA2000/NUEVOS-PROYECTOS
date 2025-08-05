import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useNotification } from '../hooks/useNotification';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

const Settings: React.FC = () => {
  const { success, error } = useNotification();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: theme === 'dark',
    language: language,
  });

  const handleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'darkMode') {
      setTheme(value ? 'dark' : 'light');
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSettings((prev) => ({
      ...prev,
      language: newLanguage,
    }));
    setLanguage(newLanguage);
  };

  const handleSave = async () => {
    try {
      // Aquí iría la lógica para guardar las preferencias en el backend
      success('Configuración guardada correctamente');
    } catch (err) {
      error('Error al guardar la configuración');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Configuración
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Notificaciones
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={handleChange('emailNotifications')}
                  />
                }
                label="Notificaciones por Email"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={handleChange('smsNotifications')}
                  />
                }
                label="Notificaciones SMS"
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Apariencia
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkMode}
                    onChange={handleChange('darkMode')}
                  />
                }
                label="Modo Oscuro"
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Idioma
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant={settings.language === 'es' ? 'contained' : 'outlined'}
                onClick={() => handleLanguageChange('es')}
                sx={{ mr: 2 }}
              >
                Español
              </Button>
              <Button
                variant={settings.language === 'en' ? 'contained' : 'outlined'}
                onClick={() => handleLanguageChange('en')}
              >
                English
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Guardar Cambios
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings; 