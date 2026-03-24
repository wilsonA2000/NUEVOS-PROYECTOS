/**
 * Context Switcher - Cambio de contexto entre roles
 *
 * Permite a usuarios con múltiples roles cambiar entre:
 * - Vista de Arrendador
 * - Vista de Arrendatario
 * - Vista de Admin Legal (si tiene permisos)
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  alpha,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Home as LandlordIcon,
  Key as TenantIcon,
  Gavel as AdminIcon,
  Build as ServiceIcon,
  SwapHoriz as SwitchIcon,
  Check as CheckIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

// Tipos de contexto disponibles
interface ContextOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  description: string;
}

// Definición de contextos
const CONTEXT_OPTIONS: Record<string, ContextOption> = {
  landlord: {
    id: 'landlord',
    label: 'Arrendador',
    shortLabel: 'Arrendador',
    icon: <LandlordIcon />,
    color: '#2196f3',
    path: '/app/dashboard',
    description: 'Gestiona tus propiedades y contratos',
  },
  tenant: {
    id: 'tenant',
    label: 'Arrendatario',
    shortLabel: 'Arrendatario',
    icon: <TenantIcon />,
    color: '#4caf50',
    path: '/app/dashboard',
    description: 'Busca propiedades y gestiona arriendos',
  },
  service_provider: {
    id: 'service_provider',
    label: 'Proveedor de Servicios',
    shortLabel: 'Servicios',
    icon: <ServiceIcon />,
    color: '#ff9800',
    path: '/app/services',
    description: 'Ofrece tus servicios profesionales',
  },
  admin: {
    id: 'admin',
    label: 'Admin Legal',
    shortLabel: 'Admin',
    icon: <AdminIcon />,
    color: '#9c27b0',
    path: '/app/admin',
    description: 'Panel de administración y auditoría',
  },
};

// Key para localStorage
const CONTEXT_STORAGE_KEY = 'verihome_user_context';

interface ContextSwitcherProps {
  compact?: boolean;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Detectar contextos disponibles para el usuario
  const availableContexts = useMemo(() => {
    const contexts: ContextOption[] = [];

    if (!user) return contexts;

    // Contexto de negocio basado en user_type (campo correcto del modelo)
    if (user.user_type === 'landlord') {
      contexts.push(CONTEXT_OPTIONS.landlord!);
    }
    if (user.user_type === 'tenant') {
      contexts.push(CONTEXT_OPTIONS.tenant!);
    }
    if (user.user_type === 'service_provider') {
      contexts.push(CONTEXT_OPTIONS.service_provider!);
    }

    // Contexto admin (independiente del user_type)
    if (user.is_staff || user.is_superuser) {
      contexts.push(CONTEXT_OPTIONS.admin!);
    }

    return contexts;
  }, [user]);

  // Detectar contexto actual basado en URL + localStorage
  const currentContext = useMemo(() => {
    const path = location.pathname;

    // Rutas admin siempre = contexto admin
    if (path.startsWith('/app/admin')) {
      return CONTEXT_OPTIONS.admin;
    }

    // Ruta de suscripciones = service_provider
    if (path.startsWith('/app/subscriptions')) {
      return CONTEXT_OPTIONS.service_provider;
    }

    // Leer preferencia guardada de localStorage
    const savedContext = localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (savedContext && CONTEXT_OPTIONS[savedContext]) {
      // Verificar que el usuario tenga acceso a ese contexto
      const hasAccess = availableContexts.some(c => c.id === savedContext);
      if (hasAccess) {
        return CONTEXT_OPTIONS[savedContext];
      }
    }

    // Fallback: usar user_type
    if (user?.user_type && CONTEXT_OPTIONS[user.user_type]) {
      return CONTEXT_OPTIONS[user.user_type];
    }

    return availableContexts[0] ?? CONTEXT_OPTIONS.landlord!;
  }, [location.pathname, user?.user_type, availableContexts]) as ContextOption;

  // Si solo tiene un contexto, no mostrar el switcher
  if (availableContexts.length <= 1) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleContextChange = (context: ContextOption) => {
    // Guardar preferencia en localStorage
    localStorage.setItem(CONTEXT_STORAGE_KEY, context.id);

    // Navegar al path del contexto
    navigate(context.path);

    handleClose();
  };

  const isOpen = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title="Cambiar contexto de trabajo" arrow>
        <Button
          onClick={handleClick}
          variant="outlined"
          size="small"
          startIcon={
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: alpha(currentContext.color, 0.15),
                color: currentContext.color,
              }}
            >
              {React.cloneElement(currentContext.icon as React.ReactElement, {
                sx: { fontSize: 16 },
              })}
            </Avatar>
          }
          endIcon={<ExpandIcon sx={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
            borderColor: alpha(currentContext.color, 0.5),
            color: currentContext.color,
            bgcolor: alpha(currentContext.color, 0.05),
            px: compact ? 1.5 : 2,
            py: 0.5,
            minWidth: compact ? 'auto' : 140,
            '&:hover': {
              borderColor: currentContext.color,
              bgcolor: alpha(currentContext.color, 0.1),
            },
          }}
        >
          {!compact && (
            <Typography variant="body2" fontWeight={500} noWrap>
              {currentContext.shortLabel}
            </Typography>
          )}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 280,
            maxWidth: 320,
            borderRadius: 2,
            mt: 1,
            overflow: 'visible',
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwitchIcon fontSize="small" />
            Cambiar contexto de trabajo
          </Typography>
        </Box>

        <Divider />

        {/* Opciones de contexto */}
        {availableContexts.map((context) => {
          const isActive = currentContext.id === context.id;

          return (
            <MenuItem
              key={context.id}
              onClick={() => handleContextChange(context)}
              selected={isActive}
              sx={{
                py: 1.5,
                px: 2,
                '&.Mui-selected': {
                  bgcolor: alpha(context.color, 0.08),
                  '&:hover': {
                    bgcolor: alpha(context.color, 0.12),
                  },
                },
              }}
            >
              <ListItemIcon>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(context.color, isActive ? 0.2 : 0.1),
                    color: context.color,
                  }}
                >
                  {context.icon}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={isActive ? 600 : 400}>
                      {context.label}
                    </Typography>
                    {isActive && (
                      <Chip
                        label="Activo"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: alpha(context.color, 0.15),
                          color: context.color,
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {context.description}
                  </Typography>
                }
              />
              {isActive && (
                <CheckIcon sx={{ color: context.color, ml: 1 }} />
              )}
            </MenuItem>
          );
        })}

        {/* Footer con info */}
        <Divider />
        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Usuario: {user?.email}
          </Typography>
        </Box>
      </Menu>
    </Box>
  );
};

export default ContextSwitcher;
