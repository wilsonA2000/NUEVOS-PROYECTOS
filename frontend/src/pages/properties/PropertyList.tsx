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
  Chip,
  Grid,
  IconButton,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProperties } from '../../hooks/useProperties';
import { Property } from '../../types/property';
import ExportButton from '../../components/ExportButton';
import { ensureArray } from '../../utils/arrayUtils';
import PropertyImage from '../../components/common/PropertyImage';
import PropertyFilters from '../../components/properties/PropertyFilters';
import PropertyCards from '../../components/properties/PropertyCards';
import PropertyTable from '../../components/properties/PropertyTable';
import { usePropertyFilters } from '../../components/properties/hooks/usePropertyFilters';
import PropertiesErrorBoundary from '../../components/properties/PropertiesErrorBoundary';
import { usePerformanceTracking } from '../../utils/performanceMonitor';
import { SortableColumns, SortOrder } from '../../components/properties/PropertyTable';

type ViewMode = 'cards' | 'table';

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
  const { filters, updateFilter, clearFilters, hasActiveFilters } = usePropertyFilters();
  
  // Hook de propiedades con filtros
  const { properties, isLoading, error, deleteProperty } = useProperties(filters);
  
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
      } catch (error) {
        console.error('Error deleting property:', error);
      }
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
    console.log('Filtros aplicados:', filters);
  };

  // View mode handlers
  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode | null) => {
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
    } catch (error) {
      console.error('Error bulk deleting properties:', error);
    }
  };

  const handleToggleFavorite = (id: string) => {
    // Implement toggle favorite logic
    console.log('Toggle favorite for property:', id);
  };

  // Table pagination handlers
  const handleTablePageChange = (_event: unknown, newPage: number) => {
    setTablePage(newPage);
  };

  const handleTableRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTableRowsPerPage(parseInt(event.target.value, 10));
    setTablePage(0);
  };

  // Cards pagination (if you want to add pagination to cards)
  const handleCardsPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    // Implement if needed
    console.log('Cards page change:', value);
  };

  const isLandlord = user?.user_type === 'landlord' || user?.user_type === 'admin';

  // Asegurar que properties sea un array
  const propertiesArray = ensureArray(properties);

  // Estados de carga y error mejorados
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Necesitas iniciar sesión para ver las propiedades
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Iniciar Sesión
        </Button>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
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
        <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: 'background.paper' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Propiedades
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalCount} propiedades encontradas
                {hasActiveFilters && ' (con filtros aplicados)'}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              {/* View Toggle - Solo en desktop */}
              {!isMobile && (
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  sx={{ mr: 2 }}
                >
                  <ToggleButton value="cards" aria-label="Vista de tarjetas">
                    <Tooltip title="Vista de tarjetas">
                      <GridViewIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="table" aria-label="Vista de tabla">
                    <Tooltip title="Vista de tabla">
                      <ListViewIcon />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
              
              {/* Export Button */}
              <ExportButton type="properties" />
              
              {/* Create New Button - Solo para landlords */}
              {user?.user_type === 'landlord' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                  size="medium"
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
                  backgroundColor: theme.palette.primary.main + '08',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.primary.main}20`
                }}
              >
                <Typography variant="body2" color="primary" fontWeight={600}>
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
              <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No se encontraron propiedades
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay propiedades registradas'}
              </Typography>
              {hasActiveFilters && (
                <Button 
                  variant="outlined" 
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
                    properties={propertiesArray}
                    page={1} // You may want to implement pagination for cards too
                    totalPages={1}
                    onPageChange={handleCardsPageChange}
                    onView={handleView}
                    onEdit={(id: string) => handleEdit(new MouseEvent('click') as any, id)}
                    onDelete={(id: string) => handleDeleteClick(new MouseEvent('click') as any, id)}
                    onToggleFavorite={handleToggleFavorite}
                    userType={user?.user_type || 'tenant'}
                    currentUser={user}
                  />
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <PropertyTable
                    properties={propertiesArray}
                    page={tablePage}
                    rowsPerPage={tableRowsPerPage}
                    totalCount={totalCount}
                    onPageChange={handleTablePageChange}
                    onRowsPerPageChange={handleTableRowsPerPageChange}
                    onView={handleView}
                    onEdit={(id: string) => handleEdit(new MouseEvent('click') as any, id)}
                    onDelete={(id: string) => handleDeleteClick(new MouseEvent('click') as any, id)}
                    onToggleFavorite={handleToggleFavorite}
                    userType={user?.user_type || 'tenant'}
                    currentUser={user}
                    loading={isLoading}
                    selected={selectedProperties}
                    onSelectionChange={handleSelectionChange}
                    onBulkDelete={handleBulkDelete}
                    onBulkToggleFavorite={handleToggleFavorite}
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
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h6" component="div">
              Confirmar eliminación
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Todas las imágenes, datos e información relacionada se eliminarán permanentemente.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={deleteProperty.isPending}
              startIcon={
                deleteProperty.isPending ? 
                  <CircularProgress size={16} /> : 
                  <DeleteIcon />
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