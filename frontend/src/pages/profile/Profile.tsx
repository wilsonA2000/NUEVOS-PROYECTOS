import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { userService } from '../../services/userService';
import { UpdateProfileDto } from '../../types/user';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  address: string;
  city: string;
  state: string;
  country: string;
  occupation: string;
  company: string;
  education: string;
  languages: string[];
  skills: string[];
  experience_years: number;
  is_verified: boolean;
  preferences: {
    notifications_email: boolean;
    notifications_sms: boolean;
    notifications_push: boolean;
    newsletter: boolean;
  };
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      address: '',
      city: '',
      state: '',
      country: 'Colombia',
      occupation: '',
      company: '',
      education: '',
      languages: ['Español'],
      skills: [],
      experience_years: 0,
      is_verified: user?.is_verified || false,
      preferences: {
        notifications_email: true,
        notifications_sms: false,
        notifications_push: true,
        newsletter: true,
      },
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAvatar(event.target.files[0]);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Preparar datos para actualización
      const updateData: UpdateProfileDto = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
      };

      // Actualizar perfil
      const updatedUser = await userService.updateProfile(updateData);

      // Subir avatar si se seleccionó
      if (avatar) {
        const avatarResponse = await userService.uploadAvatar(avatar);
        updatedUser.avatar = avatarResponse.avatar_url;
      }

      // Actualizar el contexto de usuario
      updateUser(updatedUser);
      
      setSuccessMessage('Perfil actualizado exitosamente');
      setShowSuccess(true);
      setIsEditing(false);
      
      // Ocultar mensaje después de 2 segundos
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSuccessMessage('Error al actualizar el perfil');
      setShowSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setAvatar(null);
    setIsEditing(false);
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

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user?.avatar}
                alt={user?.first_name}
                sx={{ width: 100, height: 100, mr: 3 }}
              />
              {isEditing && (
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  }}
                  component="label"
                >
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <PhotoCameraIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" gutterBottom>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              {user?.is_verified && (
                <Chip
                  label="Verificado"
                  color="success"
                  size="small"
                  icon={<PersonIcon />}
                />
              )}
            </Box>
            {!isEditing && (
              <IconButton
                onClick={() => setIsEditing(true)}
                sx={{ backgroundColor: 'primary.main', color: 'white' }}
              >
                <EditIcon />
              </IconButton>
            )}
          </Box>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="first_name"
                  control={control}
                  rules={{ required: 'El nombre es requerido' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Nombre"
                      disabled={!isEditing}
                      error={!!errors.first_name}
                      helperText={errors.first_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="last_name"
                  control={control}
                  rules={{ required: 'El apellido es requerido' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Apellidos"
                      disabled={!isEditing}
                      error={!!errors.last_name}
                      helperText={errors.last_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ 
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      disabled={!isEditing}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Teléfono"
                      disabled={!isEditing}
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {isEditing && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </Box>
            )}
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile; 