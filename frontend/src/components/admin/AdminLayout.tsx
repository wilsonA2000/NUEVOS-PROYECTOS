/**
 * 🏛️ ADMIN LAYOUT (Plan Maestro V2.0)
 *
 * Layout especializado para el Dashboard de Administración Legal.
 * Incluye menú lateral, header con notificaciones y área de contenido.
 *
 * Features:
 * - Menú lateral colapsable con items de admin
 * - Header con badge de contratos pendientes
 * - Notificaciones en tiempo real de contratos urgentes
 * - Responsive design
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Description as ContractsIcon,
  Assessment as AuditIcon,
  Security as SecurityIcon,
  History as LogsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Gavel as GavelIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { AdminService } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import AdminNotificationBell from './AdminNotificationBell';
import AdminNotificationDrawer from './AdminNotificationDrawer';

// Ancho del drawer
const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

// Items del menú admin
const adminMenuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/app/admin',
  },
  {
    id: 'contracts',
    label: 'Contratos',
    icon: <ContractsIcon />,
    path: '/app/admin/contracts',
    badge: true, // Mostrar badge con pendientes
  },
  {
    id: 'audit',
    label: 'Auditoría',
    icon: <AuditIcon />,
    path: '/app/admin/audit',
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: <SecurityIcon />,
    path: '/app/admin/security',
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: <LogsIcon />,
    path: '/app/admin/logs',
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento',
    icon: <WarningIcon />,
    path: '/app/admin/maintenance',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: <SettingsIcon />,
    path: '/app/admin/settings',
  },
];

/**
 * Layout principal de administración
 */
const AdminLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { isSuperuser, isStaff } = useAdminAuth();

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useAdminNotifications();

  // Fetch stats para badges
  const { data: stats } = useQuery({
    queryKey: ['admin-contract-stats'],
    queryFn: AdminService.getContractStats,
    refetchInterval: 30000,
  });

  // Determinar item activo
  const isItemActive = (path: string) => {
    if (path === '/app/admin') {
      return location.pathname === '/app/admin';
    }
    return location.pathname.startsWith(path);
  };

  // Navegación
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Contenido del drawer
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del drawer */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'space-between' : 'center',
        }}
      >
        {drawerOpen && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon color="primary" />
            <Typography variant="h6" fontWeight="bold" color="primary">
              Admin Legal
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton onClick={() => setDrawerOpen(!drawerOpen)}>
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Menu items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {adminMenuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isItemActive(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: drawerOpen ? 40 : 'auto',
                  mr: drawerOpen ? 2 : 0,
                  justifyContent: 'center',
                }}
              >
                {item.badge && stats?.pending_review ? (
                  <Badge badgeContent={stats.pending_review} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              {drawerOpen && <ListItemText primary={item.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Footer del drawer — volver al app principal */}
      <Box sx={{ p: 1 }}>
        <ListItemButton
          onClick={() => handleNavigation('/app/dashboard')}
          sx={{ borderRadius: 1, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: drawerOpen ? 40 : 'auto', mr: drawerOpen ? 2 : 0, justifyContent: 'center' }}>
            <ArrowBackIcon fontSize="small" />
          </ListItemIcon>
          {drawerOpen && <ListItemText primary="Volver al App" primaryTypographyProps={{ variant: 'body2' }} />}
        </ListItemButton>
        {drawerOpen && (
          <Chip
            size="small"
            color={isSuperuser ? 'error' : 'primary'}
            label={isSuperuser ? 'Superuser' : 'Staff'}
            icon={<SecurityIcon />}
            sx={{ ml: 1 }}
          />
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon color="primary" />
            <Typography variant="h6" fontWeight="bold" noWrap>
              VeriHome Admin
            </Typography>
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Alerta de urgentes */}
          {stats?.urgent_contracts && stats.urgent_contracts > 0 && (
            <Tooltip title={`${stats.urgent_contracts} contratos urgentes (>7 días)`}>
              <Chip
                icon={<WarningIcon />}
                label={`${stats.urgent_contracts} urgentes`}
                color="error"
                size="small"
                sx={{ mr: 2 }}
              />
            </Tooltip>
          )}

          {/* Notificaciones */}
          <AdminNotificationBell
            unreadCount={unreadCount + (stats?.pending_review || 0)}
            onClick={() => setNotifDrawerOpen(true)}
          />

          {/* Usuario */}
          <Tooltip title={user?.email || 'Usuario'}>
            <IconButton sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Drawer - Desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          {drawerContent}
        </Drawer>
      )}

      {/* Drawer - Mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          pt: '64px', // AppBar height
        }}
      >
        <Outlet />
      </Box>

      {/* Notification Drawer */}
      <AdminNotificationDrawer
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClear={clearNotification}
      />
    </Box>
  );
};

export default AdminLayout;
