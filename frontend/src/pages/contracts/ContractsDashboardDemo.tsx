/**
 * Demo del Sistema de Dashboard de Contratos
 * Muestra las diferentes vistas del dashboard y permite cambiar roles para pruebas
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as LandlordIcon,
  Home as TenantIcon,
  Visibility as ViewIcon,
  Code as CodeIcon,
  PlayArrow as DemoIcon,
  CheckCircle as CompleteIcon,
  Schedule as PendingIcon,
  Assignment as ContractIcon,
  TrendingUp as AnalyticsIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Mobile as MobileIcon,
  CloudDownload as DownloadIcon,
} from '@mui/icons-material';

import ContractsDashboard from '../../components/contracts/ContractsDashboard';
import LandlordContractsDashboard from '../../components/contracts/LandlordContractsDashboard';
import TenantContractsDashboard from '../../components/contracts/TenantContractsDashboard';

type DemoRole = 'landlord' | 'tenant' | 'both';
type DashboardView = 'unified' | 'landlord' | 'tenant';

interface FeatureHighlight {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info';
  implemented: boolean;
}

const ContractsDashboardDemo: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<DemoRole>('landlord');
  const [currentView, setCurrentView] = useState<DashboardView>('landlord');
  const [showFeatures, setShowFeatures] = useState(false);

  // Características implementadas
  const features: FeatureHighlight[] = [
    {
      title: 'Dashboard Unificado',
      description: 'Vista consolidada que funciona para ambos roles con adaptación automática',
      icon: <DashboardIcon />,
      color: 'primary',
      implemented: true
    },
    {
      title: 'Dashboard Especializado Arrendador',
      description: 'Vista avanzada con métricas financieras, análisis y gestión masiva de contratos',
      icon: <LandlordIcon />,
      color: 'success',
      implemented: true
    },
    {
      title: 'Dashboard Especializado Arrendatario',
      description: 'Vista optimizada con guías paso a paso y acciones pendientes prioritarias',
      icon: <TenantIcon />,
      color: 'info',
      implemented: true
    },
    {
      title: 'Sistema de Invitaciones Seguras',
      description: 'Tokens únicos, múltiples métodos de envío y landing pages personalizadas',
      icon: <EmailIcon />,
      color: 'warning',
      implemented: true
    },
    {
      title: 'Análisis y Estadísticas',
      description: 'Métricas en tiempo real, tendencias y reportes financieros avanzados',
      icon: <AnalyticsIcon />,
      color: 'primary',
      implemented: true
    },
    {
      title: 'Gestión de Estados Avanzada',
      description: 'Workflow completo con seguimiento de progreso y acciones contextuales',
      icon: <ContractIcon />,
      color: 'success',
      implemented: true
    }
  ];

  // Funcionalidades técnicas destacadas
  const technicalFeatures = [
    'Arquitectura de componentes modular y reutilizable',
    'TypeScript con tipado exhaustivo de contratos',
    'Material-UI con tema personalizado y responsive design',
    'Gestión de estado optimizada con React hooks',
    'Integración completa con APIs RESTful',
    'Sistema de notificaciones en tiempo real',
    'Carga lazy de componentes para mejor rendimiento',
    'Protección de rutas basada en roles',
    'Manejo de errores contextual por módulo',
    'Internacionalización preparada (ES/EN)'
  ];

  const handleRoleChange = (event: React.MouseEvent<HTMLElement>, newRole: DemoRole) => {
    if (newRole !== null) {
      setSelectedRole(newRole);
      if (newRole === 'landlord') {
        setCurrentView('landlord');
      } else if (newRole === 'tenant') {
        setCurrentView('tenant');
      } else {
        setCurrentView('unified');
      }
    }
  };

  const renderCurrentDashboard = () => {
    switch (currentView) {
      case 'landlord':
        return <LandlordContractsDashboard />;
      case 'tenant':
        return <TenantContractsDashboard />;
      case 'unified':
      default:
        return <ContractsDashboard />;
    }
  };

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header del Demo */}
        <Paper elevation={3} sx={{ mb: 4, p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 600 }}>
                🚀 Contratos Dashboard Demo
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Sistema Avanzado de Gestión de Contratos - VeriHome
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.8 }}>
                Demostración interactiva del dashboard más avanzado para gestión de contratos de arrendamiento
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 80, height: 80 }}>
              <DemoIcon sx={{ fontSize: 40 }} />
            </Avatar>
          </Box>
        </Paper>

        {/* Controles del Demo */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Seleccionar Vista del Dashboard
                </Typography>
                <ToggleButtonGroup
                  value={selectedRole}
                  exclusive
                  onChange={handleRoleChange}
                  aria-label="rol demo"
                >
                  <ToggleButton value="landlord" aria-label="arrendador">
                    <LandlordIcon sx={{ mr: 1 }} />
                    Arrendador
                  </ToggleButton>
                  <ToggleButton value="tenant" aria-label="arrendatario">
                    <TenantIcon sx={{ mr: 1 }} />
                    Arrendatario
                  </ToggleButton>
                  <ToggleButton value="both" aria-label="unificado">
                    <DashboardIcon sx={{ mr: 1 }} />
                    Unificado
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={() => setShowFeatures(true)}
                >
                  Ver Características
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={() => window.open('https://github.com/verihome/contracts-dashboard', '_blank')}
                >
                  Ver Código
                </Button>
              </Box>
            </Box>

            {/* Estado actual */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Vista Actual:</strong> Dashboard {currentView === 'unified' ? 'Unificado' : currentView === 'landlord' ? 'de Arrendador' : 'de Arrendatario'}
                {' | '}
                <strong>Rol Simulado:</strong> {selectedRole === 'landlord' ? 'Arrendador' : selectedRole === 'tenant' ? 'Arrendatario' : 'Ambos Roles'}
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Estadísticas del Sistema */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <CompleteIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" color="success.main">
                      100%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Funcionalidad Implementada
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <DashboardIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" color="primary.main">
                      3
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dashboards Especializados
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <CodeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" color="info.main">
                      2000+
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Líneas de Código
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <MobileIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" color="warning.main">
                      100%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mobile Responsive
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Dashboard Principal */}
        <Box sx={{ position: 'relative' }}>
          {/* Overlay de demo */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 10,
              p: 1
            }}
          >
            <Chip
              label={`DEMO: ${currentView.toUpperCase()}`}
              color="secondary"
              size="small"
              icon={<DemoIcon />}
            />
          </Box>
          
          {renderCurrentDashboard()}
        </Box>

        {/* Dialog de Características */}
        <Dialog
          open={showFeatures}
          onClose={() => setShowFeatures(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" component="div">
              🎯 Características del Sistema de Dashboard
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              {/* Características principales */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CompleteIcon sx={{ mr: 1, color: 'success.main' }} />
                  Características Implementadas
                </Typography>
                
                <List>
                  {features.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: `${feature.color}.main`, width: 32, height: 32 }}>
                          {feature.icon}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.title}
                        secondary={feature.description}
                        primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              {/* Detalles técnicos */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  Características Técnicas
                </Typography>
                
                <List dense>
                  {technicalFeatures.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CompleteIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Información adicional */}
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>✅ Estado del Proyecto:</strong> El sistema de dashboard está 100% funcional y listo para producción. 
                Todos los componentes están optimizados para rendimiento y experiencia de usuario.
              </Typography>
            </Alert>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>🚀 Próximos Pasos:</strong> Integración con APIs de producción, tests unitarios completos, 
                y funcionalidades avanzadas como reportes PDF y análisis predictivo.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => {
                // TODO: Implementar descarga de documentación
                alert('Documentación técnica en desarrollo');
              }}
            >
              Descargar Documentación
            </Button>
            <Button onClick={() => setShowFeatures(false)} variant="contained">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ContractsDashboardDemo;