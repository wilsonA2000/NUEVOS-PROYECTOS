import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  IconButton,
  Breadcrumbs,
  Link,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemButton,
  CssBaseline,
  Button,
  ListItemAvatar,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Home,
  Description,
  Payment,
  Message,
  Settings,
  Person,
  Notifications,
  Logout,
  Build,
  Assessment,
  ChevronRight,
  Star,
  AccountCircle,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications, Notification } from '../../hooks/useNotifications';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/app/dashboard' },
  { text: 'Propiedades', icon: <Home />, path: '/app/properties' },
  { text: 'Contratos', icon: <Description />, path: '/app/contracts' },
  { text: 'Pagos', icon: <Payment />, path: '/app/payments' },
  { text: 'Mensajes', icon: <Message />, path: '/app/messages' },
  { text: 'Calificaciones', icon: <Star />, path: '/app/ratings' },
  { text: 'Servicios', icon: <Build />, path: '/app/services' },
  { text: 'Solicitudes', icon: <Assessment />, path: '/app/service-requests' },
];

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  
  // Asegurar que notifications sea siempre un array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbs = pathnames.map((name, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
      const isLast = index === pathnames.length - 1;
      
      const menuItem = menuItems.find(item => item.path === routeTo);
      const displayName = menuItem ? menuItem.text : name.charAt(0).toUpperCase() + name.slice(1);
      
      return {
        name: displayName,
        route: routeTo,
        isLast,
      };
    });

    return breadcrumbs;
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          VeriHome
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? theme.palette.primary.contrastText : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                }}
                sx={{ textDecoration: 'none' }}
              >
                Inicio
              </Link>
              {getBreadcrumbs().map((breadcrumb, index) => (
                <Typography key={index} color={breadcrumb.isLast ? 'text.primary' : 'text.secondary'}>
                  {breadcrumb.name}
                </Typography>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={safeNotifications.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
              {user?.first_name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={() => setNotificationAnchorEl(null)}
        PaperProps={{
          sx: {
            width: 350,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Notificaciones</Typography>
          {safeNotifications.length > 0 && (
            <Button
              size="small"
              onClick={() => {
                markAllAsRead();
                setNotificationAnchorEl(null);
              }}
            >
              Marcar todas como leídas
            </Button>
          )}
        </Box>
        
        {safeNotifications.length === 0 ? (
          <MenuItem>
            <Typography variant="body2" color="text.secondary">
              No hay notificaciones nuevas
            </Typography>
          </MenuItem>
        ) : (
          safeNotifications.map((notification: Notification) => (
            <MenuItem 
              key={notification.id}
              onClick={() => {
                markAsRead(notification.id);
                setNotificationAnchorEl(null);
              }}
              sx={{
                backgroundColor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: notification.type === 'success' ? 'success.main' : 
                           notification.type === 'error' ? 'error.main' :
                           notification.type === 'warning' ? 'warning.main' : 'info.main'
                }}>
                  {notification.type === 'success' ? '✓' : 
                   notification.type === 'error' ? '✗' :
                   notification.type === 'warning' ? '⚠' : 'ℹ'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={notification.title}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
              {!notification.read && (
                <Chip 
                  label="Nuevo" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: { width: 200 },
        }}
      >
        <MenuItem onClick={() => { navigate('/app/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Perfil</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate('/app/resume'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Description fontSize="small" />
          </ListItemIcon>
          <ListItemText>Hoja de Vida</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate('/app/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ajustes</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cerrar Sesión</ListItemText>
        </MenuItem>
      </Menu>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 