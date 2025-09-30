/**
 * ProfileSidebar - Panel lateral con información detallada del contacto
 * Muestra perfil completo, historial y acciones disponibles
 */

import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Paper,
  Rating,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  Home as HomeIcon,
  Build as BuildIcon,
  Money as MoneyIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  Report as ReportIcon,
} from '@mui/icons-material';

interface ProfileData {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  user_type: 'landlord' | 'tenant' | 'service_provider';
  
  // Datos específicos según tipo de usuario
  income?: number;
  occupation?: string;
  company?: string;
  references?: string[];
  
  // Para proveedores de servicios
  service_type?: string;
  experience?: string;
  certifications?: string[];
  rating?: number;
  reviews_count?: number;
  
  // Para propietarios
  properties_count?: number;
  years_experience?: number;
  
  // Información adicional
  joined_date?: string;
  last_active?: string;
  verified?: boolean;
}

interface ProfileSidebarProps {
  profile: ProfileData;
  contextInfo?: {
    type: 'property' | 'service';
    title: string;
    details?: any;
  };
  onClose: () => void;
  onBlock?: (userId: string) => void;
  onReport?: (userId: string) => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  contextInfo,
  onClose,
  onBlock,
  onReport,
}) => {
  const getUserTypeInfo = (userType: string) => {
    switch (userType) {
      case 'landlord':
        return {
          label: 'Propietario',
          icon: <HomeIcon />,
          color: 'primary' as const,
        };
      case 'tenant':
        return {
          label: 'Inquilino',
          icon: <PersonIcon />,
          color: 'secondary' as const,
        };
      case 'service_provider':
        return {
          label: 'Proveedor de Servicios',
          icon: <BuildIcon />,
          color: 'info' as const,
        };
      default:
        return {
          label: 'Usuario',
          icon: <PersonIcon />,
          color: 'default' as const,
        };
    }
  };

  const userTypeInfo = getUserTypeInfo(profile.user_type);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Información del contacto</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Contenido scrolleable */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        
        {/* Información básica */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar
            src={profile.avatar}
            sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
          >
            {profile.name[0]}
          </Avatar>
          
          <Typography variant="h6" gutterBottom>
            {profile.name}
          </Typography>
          
          <Chip
            icon={userTypeInfo.icon}
            label={userTypeInfo.label}
            color={userTypeInfo.color}
            variant="outlined"
            sx={{ mb: 1 }}
          />
          
          {profile.verified && (
            <Chip
              icon={<StarIcon />}
              label="Verificado"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
          )}

          {profile.user_type === 'service_provider' && profile.rating && (
            <Box sx={{ mt: 1 }}>
              <Rating value={profile.rating} readOnly size="small" />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({profile.reviews_count} reseñas)
              </Typography>
            </Box>
          )}
        </Box>

        {/* Información de contacto */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Contacto
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <EmailIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={profile.email}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PhoneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={profile.phone}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Paper>

        {/* Información específica según tipo de usuario */}
        {profile.user_type === 'tenant' && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Información del Inquilino
            </Typography>
            <List dense>
              {profile.income && (
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Ingresos: ${formatCurrency(profile.income)}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )}
              {profile.occupation && (
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={profile.occupation}
                    secondary={profile.company}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              )}
            </List>
            
            {profile.references && profile.references.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Referencias:
                </Typography>
                {profile.references.map((ref, index) => (
                  <Chip
                    key={index}
                    label={ref}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        )}

        {profile.user_type === 'service_provider' && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Información del Proveedor
            </Typography>
            <List dense>
              {profile.service_type && (
                <ListItem>
                  <ListItemIcon>
                    <BuildIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={profile.service_type}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )}
              {profile.experience && (
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Experiencia: ${profile.experience}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )}
            </List>
            
            {profile.certifications && profile.certifications.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Certificaciones:
                </Typography>
                {profile.certifications.map((cert, index) => (
                  <Chip
                    key={index}
                    icon={<SchoolIcon />}
                    label={cert}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        )}

        {profile.user_type === 'landlord' && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Información del Propietario
            </Typography>
            <List dense>
              {profile.properties_count && (
                <ListItem>
                  <ListItemIcon>
                    <HomeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${profile.properties_count} propiedades`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )}
              {profile.years_experience && (
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${profile.years_experience} años de experiencia`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        )}

        {/* Contexto de la conversación */}
        {contextInfo && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.contrastText' }}>
              {contextInfo.type === 'property' ? '🏠 Propiedad' : '🔧 Servicio'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>
              {contextInfo.title}
            </Typography>
            {contextInfo.details && (
              <Typography variant="caption" sx={{ color: 'primary.contrastText', opacity: 0.7 }}>
                {JSON.stringify(contextInfo.details)}
              </Typography>
            )}
          </Paper>
        )}

        {/* Información adicional */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Información Adicional
          </Typography>
          <List dense>
            {profile.joined_date && (
              <ListItem>
                <ListItemText 
                  primary={`Miembro desde: ${new Date(profile.joined_date).toLocaleDateString('es-ES')}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            {profile.last_active && (
              <ListItem>
                <ListItemText 
                  primary={`Última actividad: ${new Date(profile.last_active).toLocaleDateString('es-ES')}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>

      {/* Acciones */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {onBlock && (
          <Button
            fullWidth
            variant="outlined"
            color="warning"
            startIcon={<BlockIcon />}
            onClick={() => onBlock(profile.id)}
            sx={{ mb: 1 }}
          >
            Bloquear Usuario
          </Button>
        )}
        
        {onReport && (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<ReportIcon />}
            onClick={() => onReport(profile.id)}
          >
            Reportar Usuario
          </Button>
        )}
      </Box>
    </Box>
  );
};