/**
 * PropertyList - VERSIÓN FUSIONADA DEFINITIVA
 * Combina lo mejor de todas las versiones anteriores:
 * - Filtros avanzados del components
 * - Export functionality del pages
 * - Performance tracking y error boundaries
 * - UI/UX mejorado y responsive
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Fade,
  Paper,
  Tooltip,
  Divider,
  Container,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Apartment as ApartmentIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import LandingNavbar from '../../components/layout/LandingNavbar';
import LandingFooter from '../../components/layout/LandingFooter';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProperties } from '../../hooks/useProperties';
import { Property } from '../../types/property';

import { ensureArray } from '../../utils/arrayUtils';

import PropertyFilters from '../../components/properties/PropertyFilters';
import PropertyCards from '../../components/properties/PropertyCards';
import PropertyTable from '../../components/properties/PropertyTable';
import { usePropertyFilters } from '../../components/properties/hooks/usePropertyFilters';
import PropertiesErrorBoundary from '../../components/properties/PropertiesErrorBoundary';
import { usePerformanceTracking } from '../../utils/performanceMonitor';
import {
  SortableColumns,
  SortOrder,
} from '../../components/properties/PropertyTable';
import { vh, vhColors } from '../../theme/tokens';

type ViewMode = 'cards' | 'table';

const CARD_HOVER = {
  transition:
    'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

const RevealBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {children}
    </div>
  );
};

const BlueDivider = () => (
  <Box
    sx={{
      width: 48,
      height: 4,
      bgcolor: 'primary.main',
      borderRadius: 2,
      mx: 'auto',
      mb: 4,
    }}
  />
);

const UnauthenticatedView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'background.paper', minHeight: '100vh' }}>
      <LandingNavbar />

      {/* HERO */}
      <Box
        sx={{ background: vh.gradients.primary, color: 'white', pt: 14, pb: 8 }}
      >
        <Container maxWidth='lg' sx={{ textAlign: 'center' }}>
          <Typography
            variant='h2'
            component='h1'
            sx={{ fontWeight: 800, mb: 2 }}
          >
            Propiedades Verificadas
          </Typography>
          <Typography
            variant='h5'
            sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.7, opacity: 0.9 }}
          >
            Accede a un cat&aacute;logo exclusivo de inmuebles donde cada
            propiedad, cada arrendador y cada documento est&aacute; verificado
            por VeriHome.
          </Typography>
        </Container>
      </Box>

      {/* TIPOS DE PROPIEDADES */}
      <RevealBlock>
        <Box sx={{ py: { xs: 8, md: 10 } }}>
          <Container maxWidth='lg'>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography
                variant='h3'
                sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
              >
                Encuentra tu espacio ideal
              </Typography>
              <BlueDivider />
              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 650,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                Ya sea que busques un apartamento moderno, una casa familiar o
                un local comercial, en VeriHome cada propiedad cumple con
                est&aacute;ndares de verificaci&oacute;n rigurosos.
              </Typography>
            </Box>
            <Grid container spacing={4}>
              {[
                {
                  icon: (
                    <ApartmentIcon
                      sx={{ fontSize: 40, color: 'primary.main' }}
                    />
                  ),
                  title: 'Apartamentos',
                  desc: 'Apartamentos en las mejores zonas urbanas de Colombia. Cada publicaci\u00f3n incluye fotos verificadas, planos, servicios p\u00fablicos detallados y ubicaci\u00f3n exacta en mapa interactivo.',
                },
                {
                  icon: (
                    <HomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  ),
                  title: 'Casas',
                  desc: 'Casas familiares con espacios amplios y documentaci\u00f3n legal verificada. Incluye historial de la propiedad, certificado de tradici\u00f3n y libertad, y estado de servicios p\u00fablicos.',
                },
                {
                  icon: (
                    <BusinessIcon
                      sx={{ fontSize: 40, color: 'primary.main' }}
                    />
                  ),
                  title: 'Oficinas y Locales',
                  desc: 'Espacios comerciales ideales para tu negocio. Informaci\u00f3n detallada sobre zona comercial, aforo, estacionamientos, accesibilidad y normativa de uso de suelo.',
                },
              ].map((item, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card sx={{ height: '100%', ...CARD_HOVER }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ mb: 2 }}>{item.icon}</Box>
                      <Typography
                        variant='h6'
                        sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', lineHeight: 1.7 }}
                      >
                        {item.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </RevealBlock>

      <Divider />

      {/* POR QUE PROPIEDADES VERIFICADAS */}
      <RevealBlock>
        <Box sx={{ bgcolor: vhColors.surfaceMuted, py: { xs: 8, md: 10 } }}>
          <Container maxWidth='lg'>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography
                variant='h3'
                sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
              >
                &iquest;Por qu&eacute; propiedades verificadas?
              </Typography>
              <BlueDivider />
              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 700,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                En VeriHome no publicamos cualquier inmueble. Cada propiedad
                pasa por un proceso de verificaci&oacute;n que garantiza la
                seguridad de arrendadores y arrendatarios.
              </Typography>
            </Box>
            <Grid container spacing={4}>
              {[
                {
                  title: 'Documentaci\u00f3n legal verificada',
                  desc: 'Certificado de tradici\u00f3n y libertad, escrituras, paz y salvos de administraci\u00f3n y servicios p\u00fablicos. Todo verificado antes de publicar.',
                },
                {
                  title: 'Fotos y videos reales',
                  desc: 'Prohibimos fotos de stock o im\u00e1genes enga\u00f1osas. Cada imagen es verificada para que lo que veas sea exactamente lo que encontrar\u00e1s.',
                },
                {
                  title: 'Arrendadores calificados',
                  desc: 'Cada propietario tiene un perfil p\u00fablico con calificaciones de arrendatarios anteriores, historial de respuesta y tiempo promedio de atenci\u00f3n.',
                },
                {
                  title: 'Precios transparentes',
                  desc: 'Canon de arrendamiento, administraci\u00f3n, servicios estimados y dep\u00f3sito de garant\u00eda detallados desde la publicaci\u00f3n. Sin costos ocultos ni sorpresas.',
                },
                {
                  title: 'Ubicaci\u00f3n precisa con mapa',
                  desc: 'Cada propiedad tiene ubicaci\u00f3n exacta en mapa interactivo con informaci\u00f3n del barrio, transporte cercano, colegios, supermercados y zonas verdes.',
                },
                {
                  title: 'Contratos digitales seguros',
                  desc: 'Contratos generados autom\u00e1ticamente conforme a la Ley 820 de 2003 con firma biom\u00e9trica de 5 pasos. Validez legal plena sin salir de la plataforma.',
                },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card sx={{ height: '100%', ...CARD_HOVER }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography
                        variant='h6'
                        sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', lineHeight: 1.7 }}
                      >
                        {item.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </RevealBlock>

      <Divider />

      {/* COMO FUNCIONA PARA ARRENDATARIOS */}
      <RevealBlock>
        <Box sx={{ py: { xs: 8, md: 10 } }}>
          <Container maxWidth='lg'>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography
                variant='h3'
                sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
              >
                Si buscas arrendar
              </Typography>
              <BlueDivider />
              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 650,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                Encuentra tu pr&oacute;ximo hogar con la tranquilidad de saber
                que cada propietario est&aacute; verificado y cada contrato
                tiene respaldo legal.
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {[
                {
                  step: '1',
                  title: 'Reg\u00edstrate y verifica tu identidad',
                  desc: 'Crea tu perfil con verificaci\u00f3n de c\u00e9dula colombiana, referencias personales y laborales. Tu perfil verificado te da acceso prioritario a las mejores propiedades.',
                },
                {
                  step: '2',
                  title: 'Explora y filtra propiedades',
                  desc: 'Busca por ciudad, barrio, precio, n\u00famero de habitaciones, pet-friendly, parqueadero y m\u00e1s. Cada propiedad tiene galeria completa y ficha t\u00e9cnica detallada.',
                },
                {
                  step: '3',
                  title: 'Solicita y firma digitalmente',
                  desc: 'Env\u00eda tu solicitud al arrendador. Si es aprobada, firma el contrato con autenticaci\u00f3n biom\u00e9trica de 5 pasos desde tu celular. Todo legal y sin papeleo.',
                },
              ].map((item, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Box sx={{ textAlign: 'center', px: 2 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                      }}
                    >
                      <Typography
                        variant='h5'
                        sx={{ color: 'white', fontWeight: 800 }}
                      >
                        {item.step}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', lineHeight: 1.7 }}
                    >
                      {item.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </RevealBlock>

      <Divider />

      {/* COMO FUNCIONA PARA ARRENDADORES */}
      <RevealBlock>
        <Box sx={{ bgcolor: vhColors.surfaceMuted, py: { xs: 8, md: 10 } }}>
          <Container maxWidth='lg'>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography
                variant='h3'
                sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
              >
                Si eres propietario
              </Typography>
              <BlueDivider />
              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 650,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                Publica tus propiedades y conecta con arrendatarios verificados
                que cumplen todos los requisitos. Olvídate de los riesgos del
                arrendamiento tradicional.
              </Typography>
            </Box>
            <Grid container spacing={4}>
              {[
                {
                  title: 'Arrendatarios verificados',
                  desc: 'Solo personas con identidad confirmada, historial crediticio revisado y referencias comprobables pueden solicitar tus propiedades. Filtramos por ti.',
                },
                {
                  title: 'Publicaci\u00f3n profesional',
                  desc: 'Sube fotos, videos, planos y documentaci\u00f3n. Nuestra plataforma presenta tu propiedad con calidad profesional y la posiciona ante los mejores candidatos.',
                },
                {
                  title: 'Contratos autom\u00e1ticos',
                  desc: 'Genera contratos conformes a la Ley 820 con cl\u00e1usulas din\u00e1micas, ajuste IPC anual autom\u00e1tico y renovaci\u00f3n inteligente. Todo sin abogado.',
                },
                {
                  title: 'Cobro y seguimiento',
                  desc: 'Gestiona pagos de arriendo, genera recibos autom\u00e1ticos, controla fechas de vencimiento y recibe alertas de mora. Todo desde tu dashboard personalizado.',
                },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Card sx={{ height: '100%', ...CARD_HOVER }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography
                        variant='h6'
                        sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', lineHeight: 1.7 }}
                      >
                        {item.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </RevealBlock>

      <Divider />

      {/* ESTADISTICAS */}
      <Box sx={{ background: vh.gradients.primary, py: { xs: 6, md: 8 } }}>
        <Container maxWidth='lg'>
          <Grid container spacing={4}>
            {[
              { value: '500+', label: 'Propiedades Verificadas' },
              { value: '1,000+', label: 'Usuarios Activos' },
              { value: '98%', label: 'Satisfacci\u00f3n' },
              { value: '24h', label: 'Tiempo Promedio de Respuesta' },
            ].map((stat, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant='h3'
                    sx={{ color: 'white', fontWeight: 800 }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      mt: 0.5,
                      fontWeight: 500,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA FINAL */}
      <RevealBlock>
        <Box sx={{ py: { xs: 8, md: 10 } }}>
          <Container maxWidth='md'>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h4'
                sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}
              >
                &iquest;Listo para encontrar tu pr&oacute;ximo hogar?
              </Typography>
              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  mb: 4,
                  maxWidth: 550,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                Reg&iacute;strate gratis y accede al cat&aacute;logo completo de
                propiedades verificadas. Publica, busca y firma contratos
                digitales con total seguridad.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant='contained'
                  size='large'
                  onClick={() => navigate('/register')}
                  sx={{ fontWeight: 700, px: 4, py: 1.5 }}
                >
                  Registrarme gratis
                </Button>
                <Button
                  variant='outlined'
                  size='large'
                  onClick={() => navigate('/contact')}
                  sx={{ fontWeight: 600, px: 4, py: 1.5 }}
                >
                  Contactar equipo
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      </RevealBlock>

      <LandingFooter />
    </Box>
  );
};

const PropertyList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { trackRender } = usePerformanceTracking('PropertyList');

  // Estados locales
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem('property-view-mode') as ViewMode;
    return savedView || (isMobile ? 'cards' : 'table');
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortableColumns>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state for table view
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(20);

  // Usar hook de filtros existente (lo mejor del components)
  const { filters, updateFilter, clearFilters, hasActiveFilters } =
    usePropertyFilters();

  // Hook de propiedades con filtros
  const { properties, isLoading, error, deleteProperty } =
    useProperties(filters);

  // Performance tracking
  useEffect(() => {
    const renderStart = performance.now();
    return () => {
      const renderEnd = performance.now();
      trackRender(renderEnd - renderStart);
    };
  }, [trackRender]);

  // Persistir view mode preference
  useEffect(() => {
    localStorage.setItem('property-view-mode', viewMode);
  }, [viewMode]);

  // Auto switch to cards on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('cards');
    }
  }, [isMobile, viewMode]);

  // Event handlers mejorados
  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/app/properties/${id}/edit`);
  };

  const handleView = (id: string) => {
    navigate(`/app/properties/${id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPropertyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (propertyToDelete) {
      try {
        await deleteProperty.mutateAsync(propertyToDelete);
        setDeleteDialogOpen(false);
        setPropertyToDelete(null);
      } catch (error) {}
    }
  };

  const handlePropertyClick = (property: Property) => {
    navigate(`/app/properties/${property.id}`);
  };

  const handleCreateNew = () => {
    navigate('/app/properties/new');
  };

  const handleApplyFilters = () => {
    // Los filtros se aplican automáticamente a través del hook
  };

  // View mode handlers
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null,
  ) => {
    if (newViewMode && !isMobile) {
      setViewMode(newViewMode);
    }
  };

  // Sorting handlers
  const handleSort = (column: SortableColumns) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Selection handlers
  const handleSelectionChange = (selected: string[]) => {
    setSelectedProperties(selected);
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Implement bulk delete logic
      for (const id of ids) {
        await deleteProperty.mutateAsync(id);
      }
      setSelectedProperties([]);
    } catch (error) {}
  };

  const handleToggleFavorite = (id: string) => {
    // Implement toggle favorite logic
  };

  // Table pagination handlers
  const handleTablePageChange = (_event: unknown, newPage: number) => {
    setTablePage(newPage);
  };

  const handleTableRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setTableRowsPerPage(parseInt(event.target.value, 10));
    setTablePage(0);
  };

  // Cards pagination (if you want to add pagination to cards)
  const handleCardsPageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    // Implement if needed
  };

  const isLandlord = user?.user_type === 'landlord';

  // Asegurar que properties sea un array
  const propertiesArray = ensureArray(properties as any);

  // Estados de carga y error mejorados
  if (authLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <UnauthenticatedView />;
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant='rectangular' height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          Error cargando propiedades: {error.message}
        </Alert>
      </Box>
    );
  }

  const totalCount = propertiesArray.length;

  return (
    <PropertiesErrorBoundary>
      <Box sx={{ p: 3 }}>
        {/* Header mejorado */}
        <Paper
          elevation={0}
          sx={{ p: 3, mb: 3, backgroundColor: 'background.paper' }}
        >
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='flex-start'
            mb={2}
          >
            <Box>
              <Typography variant='h4' component='h1' gutterBottom>
                Propiedades
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {totalCount} propiedades encontradas
                {hasActiveFilters && ' (con filtros aplicados)'}
              </Typography>
            </Box>

            <Box display='flex' alignItems='center' gap={2}>
              {/* View Toggle - Solo en desktop */}
              {!isMobile && (
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size='small'
                  sx={{ mr: 2 }}
                >
                  <ToggleButton value='cards' aria-label='Vista de tarjetas'>
                    <Tooltip title='Vista de tarjetas'>
                      <GridViewIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value='table' aria-label='Vista de tabla'>
                    <Tooltip title='Vista de tabla'>
                      <ListViewIcon />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}

              {/* Export Button */}
              {/* <ExportButton type="properties" data={[]} /> */}

              {/* Create New Button - Solo para landlords */}
              {user?.user_type === 'landlord' && (
                <Button
                  variant='contained'
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                  size='medium'
                >
                  Nueva Propiedad
                </Button>
              )}
            </Box>
          </Box>

          {/* Selection info */}
          {selectedProperties.length > 0 && (
            <Fade in={true}>
              <Box
                sx={{
                  p: 2,
                  mt: 2,
                  backgroundColor: `${theme.palette.primary.main}08`,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.primary.main}20`,
                }}
              >
                <Typography variant='body2' color='primary' fontWeight={600}>
                  {selectedProperties.length} propiedades seleccionadas
                </Typography>
              </Box>
            </Fade>
          )}
        </Paper>

        {/* Filtros avanzados - Lo mejor de components */}
        <PropertyFilters
          filters={filters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          onApplyFilters={handleApplyFilters}
          isLoading={isLoading}
        />

        {/* Content with view switching */}
        <Box sx={{ minHeight: 400 }}>
          {propertiesArray.length === 0 ? (
            <Paper elevation={0} sx={{ p: 8, textAlign: 'center' }}>
              <LocationIcon
                sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
              />
              <Typography variant='h6' color='text.secondary' gutterBottom>
                No se encontraron propiedades
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay propiedades registradas'}
              </Typography>
              {hasActiveFilters && (
                <Button
                  variant='outlined'
                  onClick={clearFilters}
                  startIcon={<FilterIcon />}
                >
                  Limpiar Filtros
                </Button>
              )}
            </Paper>
          ) : (
            <Fade in={true} timeout={300}>
              <Box>
                {/* Cards View */}
                {viewMode === 'cards' && (
                  <PropertyCards
                    properties={propertiesArray as Property[]}
                    page={1} // You may want to implement pagination for cards too
                    totalPages={1}
                    onPageChange={handleCardsPageChange}
                    onView={handleView}
                    onEdit={(id: string) =>
                      handleEdit(new MouseEvent('click') as any, id)
                    }
                    onDelete={(id: string) =>
                      handleDeleteClick(new MouseEvent('click') as any, id)
                    }
                    onToggleFavorite={handleToggleFavorite}
                    userType={user?.user_type || 'tenant'}
                    currentUser={user}
                  />
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <PropertyTable
                    properties={propertiesArray as Property[]}
                    page={tablePage}
                    rowsPerPage={tableRowsPerPage}
                    totalCount={totalCount}
                    onPageChange={handleTablePageChange}
                    onRowsPerPageChange={handleTableRowsPerPageChange}
                    onView={handleView}
                    onEdit={(id: string) =>
                      handleEdit(new MouseEvent('click') as any, id)
                    }
                    onDelete={(id: string) =>
                      handleDeleteClick(new MouseEvent('click') as any, id)
                    }
                    onToggleFavorite={handleToggleFavorite}
                    userType={user?.user_type || 'tenant'}
                    currentUser={user}
                    loading={isLoading}
                    selected={selectedProperties}
                    onSelectionChange={handleSelectionChange}
                    onBulkDelete={(ids: string[]) => handleBulkDelete(ids)}
                    onBulkToggleFavorite={(ids: string[]) =>
                      ids.forEach(id => handleToggleFavorite(id))
                    }
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    enableSelection={user?.user_type === 'landlord'}
                    enableBulkActions={user?.user_type === 'landlord'}
                    compactMode={false}
                  />
                )}
              </Box>
            </Fade>
          )}
        </Box>

        {/* Dialog mejorado de confirmación para eliminar */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant='h6' component='div'>
              Confirmar eliminación
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Alert severity='warning' sx={{ mb: 2 }}>
              <Typography variant='body2'>
                ¿Estás seguro de que quieres eliminar esta propiedad? Esta
                acción no se puede deshacer.
              </Typography>
            </Alert>
            <Typography variant='body2' color='text.secondary'>
              Todas las imágenes, datos e información relacionada se eliminarán
              permanentemente.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant='outlined'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color='error'
              variant='contained'
              disabled={deleteProperty.isPending}
              startIcon={
                deleteProperty.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  <DeleteIcon />
                )
              }
            >
              {deleteProperty.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PropertiesErrorBoundary>
  );
};

export default PropertyList;
export { PropertyList };
export type { ViewMode };
