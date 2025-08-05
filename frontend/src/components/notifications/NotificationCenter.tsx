/**
 * NotificationCenter - Advanced notification management interface
 * Complete notification center with filtering, search, and bulk actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  Pagination,
  Divider,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Card,
  CardContent,
  InputAdornment,
  Collapse,
  ButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Computer as InAppIcon,
  NotificationsActive as PushIcon,
  Message as MessageIcon,
  Home as PropertyIcon,
  Payment as PaymentIcon,
  Assignment as ContractIcon,
  Star as RatingIcon,
  Person as UserIcon,
  Security as SystemIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO, isToday, isYesterday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotificationContext, Notification } from '../../contexts/NotificationContext';
import { LoadingButton } from '../common';

interface FilterOptions {
  search: string;
  type: string;
  priority: string;
  status: string;
  channel: string;
  dateRange: 'all' | 'today' | 'yesterday' | 'week' | 'month';
  read: 'all' | 'read' | 'unread';
}

const NotificationCenter: React.FC = () => {
  const { state, actions } = useNotificationContext();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: 'all',
    priority: 'all',
    status: 'all',
    channel: 'all',
    dateRange: 'all',
    read: 'all',
  });
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  // Notification type icons
  const typeIcons = {
    message: <MessageIcon />,
    property: <PropertyIcon />,
    payment: <PaymentIcon />,
    contract: <ContractIcon />,
    rating: <RatingIcon />,
    user: <UserIcon />,
    system: <SystemIcon />,
  };

  // Channel icons
  const channelIcons = {
    in_app: <InAppIcon />,
    email: <EmailIcon />,
    sms: <SmsIcon />,
    push: <PushIcon />,
  };

  // Priority colors
  const priorityColors = {
    low: 'default',
    normal: 'primary',
    high: 'warning',
    urgent: 'error',
    critical: 'error',
  } as const;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = state.notifications;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(n => n.status === filters.status);
    }

    // Channel filter
    if (filters.channel !== 'all') {
      filtered = filtered.filter(n => n.channel === filters.channel);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(n => {
        const notificationDate = parseISO(n.timestamp);
        switch (filters.dateRange) {
          case 'today':
            return isToday(notificationDate);
          case 'yesterday':
            return isYesterday(notificationDate);
          case 'week':
            return (now.getTime() - notificationDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return (now.getTime() - notificationDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });
    }

    // Read filter
    if (filters.read !== 'all') {
      filtered = filtered.filter(n => 
        filters.read === 'read' ? n.read : !n.read
      );
    }

    return filtered;
  }, [state.notifications, filters]);

  // Paginated notifications
  const paginatedNotifications = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, page, itemsPerPage]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: state.notifications.length,
      unread: state.notifications.filter(n => !n.read).length,
      urgent: state.notifications.filter(n => n.priority === 'urgent' || n.priority === 'critical').length,
    };
  }, [state.notifications]);

  // Handle filter change
  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Handle selection
  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === paginatedNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(paginatedNotifications.map(n => n.id)));
    }
  };

  // Bulk actions
  const handleBulkMarkRead = async () => {
    for (const id of selectedNotifications) {
      await actions.markAsRead(id);
    }
    setSelectedNotifications(new Set());
  };

  const handleBulkDelete = async () => {
    for (const id of selectedNotifications) {
      await actions.removeNotification(id);
    }
    setSelectedNotifications(new Set());
  };

  // Menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notificationId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMenuAction = async (action: string) => {
    if (!selectedNotification) return;

    switch (action) {
      case 'markRead':
        await actions.markAsRead(selectedNotification);
        break;
      case 'delete':
        await actions.removeNotification(selectedNotification);
        break;
    }
    
    handleMenuClose();
  };

  // Tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(1);
    
    switch (newValue) {
      case 0: // All
        setFilters(prev => ({ ...prev, read: 'all', priority: 'all' }));
        break;
      case 1: // Unread
        setFilters(prev => ({ ...prev, read: 'unread', priority: 'all' }));
        break;
      case 2: // Urgent
        setFilters(prev => ({ ...prev, read: 'all', priority: 'urgent' }));
        break;
    }
  };

  // Format date for display
  const formatNotificationDate = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Ayer, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Centro de Notificaciones
        </Typography>
        
        <LoadingButton
          startIcon={<RefreshIcon />}
          onClick={actions.loadNotifications}
          loading={state.loading}
        >
          Actualizar
        </LoadingButton>
      </Box>

      {/* Connection Status */}
      {!state.connected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Sin conexión en tiempo real. Las notificaciones pueden no estar actualizadas.
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            label={
              <Badge badgeContent={tabCounts.all} color="primary" max={999}>
                Todas
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tabCounts.unread} color="error" max={999}>
                No leídas
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tabCounts.urgent} color="warning" max={999}>
                Urgentes
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar notificaciones..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'contained' : 'outlined'}
                size="small"
              >
                Filtros
              </Button>
              
              {selectedNotifications.size > 0 && (
                <ButtonGroup size="small">
                  <Button
                    startIcon={<MarkReadIcon />}
                    onClick={handleBulkMarkRead}
                  >
                    Marcar leídas ({selectedNotifications.size})
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    color="error"
                  >
                    Eliminar
                  </Button>
                </ButtonGroup>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        <Collapse in={showFilters}>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="message">Mensajes</MenuItem>
                  <MenuItem value="property">Propiedades</MenuItem>
                  <MenuItem value="payment">Pagos</MenuItem>
                  <MenuItem value="contract">Contratos</MenuItem>
                  <MenuItem value="system">Sistema</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  label="Prioridad"
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                  <MenuItem value="critical">Crítica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Canal</InputLabel>
                <Select
                  value={filters.channel}
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                  label="Canal"
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="in_app">In-App</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="push">Push</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Fecha</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  label="Fecha"
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="today">Hoy</MenuItem>
                  <MenuItem value="yesterday">Ayer</MenuItem>
                  <MenuItem value="week">Esta semana</MenuItem>
                  <MenuItem value="month">Este mes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Notifications List */}
      <Paper elevation={1}>
        {/* List Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Checkbox
                checked={selectedNotifications.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                indeterminate={selectedNotifications.size > 0 && selectedNotifications.size < paginatedNotifications.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2" color="text.secondary">
                {filteredNotifications.length} notificaciones encontradas
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Notifications */}
        {paginatedNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay notificaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filters.search || filters.type !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Recibirás notificaciones aquí cuando sucedan eventos importantes'
              }
            </Typography>
          </Box>
        ) : (
          <List>
            {paginatedNotifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  borderLeft: 4,
                  borderLeftColor: notification.read 
                    ? 'transparent' 
                    : `${priorityColors[notification.priority]}.main`,
                }}
              >
                <Checkbox
                  checked={selectedNotifications.has(notification.id)}
                  onChange={() => handleSelectNotification(notification.id)}
                />
                
                <ListItemIcon>
                  <Avatar
                    sx={{
                      backgroundColor: `${priorityColors[notification.priority]}.main`,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {typeIcons[notification.type] || <NotificationsIcon />}
                  </Avatar>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: notification.read ? 'normal' : 'bold',
                          lineHeight: 1.2,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      
                      <Chip
                        size="small"
                        label={notification.priority}
                        color={priorityColors[notification.priority]}
                        variant="outlined"
                      />
                      
                      {notification.channel && (
                        <Tooltip title={`Enviado vía ${notification.channel}`}>
                          {channelIcons[notification.channel] || <InAppIcon />}
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 0.5,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        {formatNotificationDate(notification.timestamp)}
                      </Typography>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, notification.id)}
                  >
                    <MoreIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Pagination */}
        {Math.ceil(filteredNotifications.length / itemsPerPage) > 1 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Pagination
              count={Math.ceil(filteredNotifications.length / itemsPerPage)}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('markRead')}>
          <ListItemIcon>
            <MarkReadIcon fontSize="small" />
          </ListItemIcon>
          Marcar como leída
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Eliminar
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default NotificationCenter;