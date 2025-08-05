/**
 * Centro de notificaciones en tiempo real
 * Muestra y gestiona todas las notificaciones push recibidas
 */

import React, { useState } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Button,
  Divider,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  Tab,
  Tabs,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Close as CloseIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Message as MessageIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useRealTimeNotifications, RealTimeNotification } from '../../hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export const RealTimeNotificationCenter: React.FC = () => {
  const {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    enablePushNotifications,
    disablePushNotifications,
    isPushEnabled,
  } = useRealTimeNotifications();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowSettings(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleNotificationClick = (notification: RealTimeNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    handleClose();
  };

  const handlePushToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      await enablePushNotifications();
    } else {
      disablePushNotifications();
    }
  };

  // Filtrar notificaciones por tipo
  const getNotificationsByType = (type?: string) => {
    if (!type) return notifications;
    return notifications.filter(n => n.type === type);
  };

  // Obtener icono por tipo de notificación
  const getNotificationIcon = (notification: RealTimeNotification) => {
    const iconProps = { 
      fontSize: 'small' as const,
      color: notification.isRead ? 'disabled' : 'primary',
    };

    switch (notification.type) {
      case 'message':
        return <MessageIcon {...iconProps} />;
      case 'payment':
        return <PaymentIcon {...iconProps} />;
      case 'property':
        return <HomeIcon {...iconProps} />;
      case 'contract':
        return <DescriptionIcon {...iconProps} />;
      case 'urgent':
        return <WarningIcon {...iconProps} color="error" />;
      case 'system':
        return <InfoIcon {...iconProps} />;
      default:
        return <CircleIcon {...iconProps} />;
    }
  };

  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  // Formatear tiempo relativo
  const formatRelativeTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: es 
    });
  };

  const open = Boolean(anchorEl);

  // Datos para las pestañas
  const tabData = [
    { label: 'Todas', count: notifications.length, notifications: notifications },
    { label: 'Mensajes', count: getNotificationsByType('message').length, notifications: getNotificationsByType('message') },
    { label: 'Pagos', count: getNotificationsByType('payment').length, notifications: getNotificationsByType('payment') },
    { label: 'Contratos', count: getNotificationsByType('contract').length, notifications: getNotificationsByType('contract') },
    { label: 'Sistema', count: getNotificationsByType('system').length, notifications: getNotificationsByType('system') },
  ];

  return (
    <>
      <Tooltip title={`${unreadCount} notificaciones nuevas`}>
        <IconButton
          onClick={handleClick}
          color={unreadCount > 0 ? 'primary' : 'default'}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {isConnected ? (
              <NotificationsActiveIcon />
            ) : (
              <NotificationsIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Paper sx={{ width: 400, maxHeight: 600 }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Notificaciones
              </Typography>
              <Box>
                <Tooltip title="Configuración">
                  <IconButton
                    size="small"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cerrar">
                  <IconButton size="small" onClick={handleClose}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Estado de conexión */}
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Badge
                color={isConnected ? 'success' : 'error'}
                variant="dot"
              >
                <Typography variant="caption" color="text.secondary">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </Typography>
              </Badge>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} nuevas`}
                  color="primary"
                  size="small"
                />
              )}
            </Box>

            {/* Configuración */}
            {showSettings && (
              <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPushEnabled}
                      onChange={handlePushToggle}
                      size="small"
                    />
                  }
                  label="Notificaciones del navegador"
                />
                
                {!isConnected && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Sin conexión - Las notificaciones pueden retrasarse
                  </Alert>
                )}
              </Box>
            )}
          </Box>

          {/* Acciones rápidas */}
          {notifications.length > 0 && (
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  startIcon={<DoneAllIcon />}
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Marcar todas como leídas
                </Button>
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={clearAllNotifications}
                  color="error"
                >
                  Limpiar todas
                </Button>
              </Box>
            </Box>
          )}

          {/* Pestañas */}
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabData.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {tab.label}
                    {tab.count > 0 && (
                      <Chip size="small" label={tab.count} />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>

          {/* Contenido de las pestañas */}
          {tabData.map((tab, index) => (
            <TabPanel key={index} value={currentTab} index={index}>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {tab.notifications.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body2" color="text.secondary">
                      No hay notificaciones
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {tab.notifications.map((notification, notIndex) => (
                      <React.Fragment key={notification.id}>
                        <ListItem
                          button
                          onClick={() => handleNotificationClick(notification)}
                          sx={{
                            bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                            '&:hover': {
                              bgcolor: 'action.selected',
                            },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: notification.isRead ? 'grey.300' : 'primary.main',
                                width: 32,
                                height: 32,
                              }}
                            >
                              {getNotificationIcon(notification)}
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: notification.isRead ? 'normal' : 'bold',
                                    flex: 1,
                                  }}
                                >
                                  {notification.title}
                                </Typography>
                                <Chip
                                  label={notification.priority}
                                  size="small"
                                  color={getPriorityColor(notification.priority) as any}
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {notification.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {formatRelativeTime(notification.timestamp)}
                                </Typography>
                              </Box>
                            }
                          />

                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        
                        {notIndex < tab.notifications.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>
          ))}
        </Paper>
      </Popover>
    </>
  );
};