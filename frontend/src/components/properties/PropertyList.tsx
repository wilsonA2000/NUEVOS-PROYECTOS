/**
 * PropertyList component - Refactored
 * Main container component that orchestrates property listing functionality
 * Now uses smaller, focused sub-components for better maintainability
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import { usePerformanceTracking } from '../../utils/performanceMonitor';

// Import our new components
import PropertyFilters from './PropertyFilters';
import PropertyTable from './PropertyTable';
import PropertyCards from './PropertyCards';
import { usePropertyFilters } from './hooks/usePropertyFilters';
import PropertiesErrorBoundary from './PropertiesErrorBoundary';
import { LoadingButton } from '../common';

type ViewMode = 'table' | 'cards';

const PropertyList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { trackRender } = usePerformanceTracking('PropertyList');

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'cards' : 'table');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Use our custom filter hook
  const { filters, updateFilter, clearFilters, hasActiveFilters } = usePropertyFilters();

  // Fetch properties with filters
  const { 
    properties, 
    isLoading, 
    error,
    deleteProperty,
    toggleFavorite 
  } = useProperties(filters);

  // Performance tracking
  useEffect(() => {
    const renderStart = performance.now();
    return () => {
      const renderEnd = performance.now();
      trackRender(renderEnd - renderStart);
    };
  });

  // Update view mode based on screen size
  useEffect(() => {
    setViewMode(isMobile ? 'cards' : 'table');
  }, [isMobile]);

  // Event handlers
  const handleView = (id: string) => {
    navigate(`/app/properties/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/app/properties/${id}/edit`);
  };

  const handleCreateNew = () => {
    navigate('/app/properties/new');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
      try {
        await deleteProperty.mutateAsync(id);
      } catch (error) {
        console.error('Error eliminando propiedad:', error);
      }
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite.mutateAsync(id);
    } catch (error) {
      console.error('Error cambiando favorito:', error);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCardPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Loading states
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

  // Ensure properties is an array
  const propertiesArray = Array.isArray(properties) ? properties : [];
  const totalCount = propertiesArray.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  // Paginate data for cards view
  const paginatedProperties = propertiesArray.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  return (
    <PropertiesErrorBoundary>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h4" component="h1">
            Propiedades ({totalCount})
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            {/* View Mode Toggle */}
            {!isMobile && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="table">
                  <ListViewIcon />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            )}

            {/* Create New Button */}
            {user?.user_type === 'landlord' && (
              <LoadingButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                loading={false}
              >
                Nueva Propiedad
              </LoadingButton>
            )}
          </Box>
        </Box>

        {/* Filters */}
        <PropertyFilters
          filters={filters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Content */}
        {propertiesArray.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No se encontraron propiedades
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay propiedades registradas'}
            </Typography>
          </Box>
        ) : (
          <>
            {viewMode === 'table' && !isMobile ? (
              <PropertyTable
                properties={propertiesArray}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={totalCount}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                userType={user?.user_type || ''}
              />
            ) : (
              <PropertyCards
                properties={paginatedProperties}
                page={page + 1}
                totalPages={totalPages}
                onPageChange={handleCardPageChange}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                userType={user?.user_type || ''}
              />
            )}
          </>
        )}
      </Box>
    </PropertiesErrorBoundary>
  );
};

export default PropertyList;