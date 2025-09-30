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
  Menu,
  MenuItem,
  ListItemButton,
  CssBaseline,
  SwipeableDrawer,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
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
  Logout,
  Build,
  Assessment,
  ChevronRight,
  Star,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import PushNotificationCenter from '../notifications/PushNotificationCenter';
import UserStatusSelector from '../users/UserStatusSelector';
import OptimizedWebSocketStatus from '../common/OptimizedWebSocketStatus';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/app/dashboard' },
  { text: 'Propiedades', icon: <Home />, path: '/app/properties' },
  { text: 'Contratos', icon: <Description />, path: '/app/contracts' },
  { text: 'Pagos', icon: <Payment />, path: '/app/payments' },
  { text: 'Mensajes', icon: <Message />, path: '/app/messages' },
  { text: 'Calificaciones', icon: <Star />, path: '/app/ratings' },
  { text: 'Servicios', icon: <Build />, path: '/app/services' },
  { text: 'Solicitudes', icon: <Assessment />, path: '/app/requests' },
];

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  
  // No WebSocket dependency for user status
  const { user, logout } = useAuth();

  // Hide/show bottom navigation on scroll for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowBottomNav(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobile]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          VeriHome
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, py: { xs: 0, sm: 1 } }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ px: { xs: 1, sm: 0 } }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  minHeight: { xs: 44, sm: 48 },
                  borderRadius: { xs: 1, sm: 0 },
                  mx: { xs: 0.5, sm: 0 },
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
                    minWidth: { xs: 32, sm: 56 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                />
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
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          color: '#1a1a1a',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          display: { xs: isMobile ? 'flex' : 'flex', md: 'flex' },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: { xs: 1, sm: 2 }, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'hidden',
            display: { xs: 'none', sm: 'block' }
          }}>
            <Breadcrumbs 
              separator={<ChevronRight fontSize="small" />}
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  flexWrap: 'nowrap'
                }
              }}
            >
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                }}
                sx={{ 
                  textDecoration: 'none',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                Inicio
              </Link>
              {getBreadcrumbs().map((breadcrumb, index) => (
                <Typography 
                  key={index} 
                  color={breadcrumb.isLast ? 'text.primary' : 'text.secondary'}
                  sx={{ 
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: { xs: 80, sm: 120 }
                  }}
                >
                  {breadcrumb.name}
                </Typography>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Mobile Title */}
          <Box sx={{ 
            flexGrow: 1, 
            display: { xs: 'block', sm: 'none' },
            textAlign: 'center'
          }}>
            <Typography 
              variant="h6" 
              noWrap
              sx={{ fontSize: '1rem' }}
            >
              VeriHome
            </Typography>
          </Box>

          {/* User Status & WebSocket Control */}
          <Box sx={{ mr: { xs: 0.5, sm: 1 }, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserStatusSelector compact={true} showLabel={false} />
            <OptimizedWebSocketStatus compact={true} showControls={!isMobile} />
          </Box>

          {/* Notifications - responsive sizing */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <PushNotificationCenter />
          </Box>

          {/* Profile Menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ p: 0.5, ml: { xs: 0.5, sm: 1 } }}
          >
            <Avatar sx={{ 
              width: { xs: 28, sm: 32 }, 
              height: { xs: 28, sm: 32 }, 
              bgcolor: theme.palette.primary.main,
              fontSize: { xs: '0.8rem', sm: '1rem' }
            }}>
              {user?.first_name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>


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
        {/* Mobile Swipeable Drawer */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          onOpen={() => setMobileOpen(true)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
            disableEnforceFocus: true, // Fix ARIA focus management issues
            disableRestoreFocus: true, // Prevent focus restoration conflicts
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: { xs: drawerWidth * 0.85, sm: drawerWidth },
              maxWidth: '85vw'
            },
          }}
        >
          {drawer}
        </SwipeableDrawer>
        
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`
            },
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
          p: { xs: 1, sm: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          mb: { xs: isMobile ? 8 : 0, md: 0 }, // Space for bottom navigation on mobile
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          value={menuItems.findIndex(item => item.path === location.pathname)}
          onChange={(_, newValue) => {
            if (newValue >= 0 && menuItems[newValue]) {
              handleNavigation(menuItems[newValue].path);
            }
          }}
          showLabels
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            transform: showBottomNav ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          {menuItems.slice(0, 4).map((item, index) => (
            <BottomNavigationAction
              key={item.text}
              label={item.text}
              icon={item.icon}
              sx={{
                minWidth: 0,
                fontSize: '0.7rem',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.7rem',
                  '&.Mui-selected': {
                    fontSize: '0.7rem',
                  },
                },
              }}
            />
          ))}
        </BottomNavigation>
      )}

      {/* Mobile Notifications */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: { xs: 70, sm: 80 },
            right: 16,
            zIndex: 1200,
            transform: showBottomNav ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <PushNotificationCenter />
        </Box>
      )}

    </Box>
  );
};

export default Layout; 