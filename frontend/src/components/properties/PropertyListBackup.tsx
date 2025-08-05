import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Tooltip,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProperties, usePropertyFilters } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import { Property } from '../../types/property';
import PropertyImage from '../common/PropertyImage';
import { usePerformanceTracking } from '../../utils/performanceMonitor';

const PropertyList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { trackRender, startOperation, endOperation } = usePerformanceTracking('PropertyList');
  
  const [filters, setFilters] = useState({
    search: '',
    property_type: '',
    status: '',
    city: '',
    min_price: '',
    max_price: '',
  });
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const { properties, isLoading, error, deleteProperty, toggleFavorite } = useProperties(filters);
  const { filters: availableFilters } = usePropertyFilters();

  // Track component render performance
  useEffect(() => {
    const renderStart = performance.now();
    const renderEnd = performance.now();
    trackRender(renderEnd - renderStart);
  });

  // Debug logs removed for production

  // Asegurar que properties sea un array
  const propertiesArray = Array.isArray(properties) ? properties : [];

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      property_type: '',
      status: '',
      city: '',
      min_price: '',
      max_price: '',
    });
  };

  const handleView = (id: string) => {
    // Navigate to property view
    navigate(`/app/properties/${id}`);
  };

  const handleEdit = (id: string) => {
    // Navigate to property edit
    navigate(`/app/properties/${id}/edit`);
  };

  const handleCreateNew = () => {
    // Navigate to create new property
    navigate('/app/properties/new');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
      startOperation('deleteProperty', { propertyId: id });
      try {
        await deleteProperty.mutateAsync(id);
        endOperation('deleteProperty');
      } catch (error) {
        endOperation('deleteProperty');
        throw error;
      }
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite.mutateAsync(id);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(propertiesArray.map(p => p.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedRows.length} propiedades?`)) {
      startOperation('bulkDeleteProperties', { count: selectedRows.length });
      try {
        for (const id of selectedRows) {
          await deleteProperty.mutateAsync(id);
        }
        setSelectedRows([]);
        endOperation('bulkDeleteProperties');
      } catch (error) {
        endOperation('bulkDeleteProperties');
        throw error;
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'rented':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'pending':
        return 'info';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      studio: 'Estudio',
      penthouse: 'Penthouse',
      townhouse: 'Casa en Condominio',
      commercial: 'Comercial',
      office: 'Oficina',
      warehouse: 'Bodega',
      land: 'Terreno',
      room: 'Habitación',
    };
    return typeLabels[type] || type;
  };

  const filteredProperties = propertiesArray.filter(property => {
    if (filters.search && !property.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.property_type && property.property_type !== filters.property_type) {
      return false;
    }
    if (filters.status && property.status !== filters.status) {
      return false;
    }
    if (filters.city && !property.city.toLowerCase().includes(filters.city.toLowerCase())) {
      return false;
    }
    if (filters.min_price && property.rent_price && property.rent_price < Number(filters.min_price)) {
      return false;
    }
    if (filters.max_price && property.rent_price && property.rent_price > Number(filters.max_price)) {
      return false;
    }
    return true;
  });

  const paginatedProperties = filteredProperties.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Renderizar cards para móvil
  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {paginatedProperties.map((property) => (
        <Grid item xs={12} sm={6} key={property.id}>
          <Card sx={{ height: '100%' }}>
            <PropertyImage
              src={
                property.main_image_url || 
                property.images?.[0]?.image_url || 
                '/images/property-placeholder.svg'
              }
              alt={property.title}
              height="200"
              style={{ borderRadius: '8px 8px 0 0' }}
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="div" gutterBottom>
                  {property.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {property.address}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={getPropertyTypeLabel(property.property_type)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={property.status}
                  color={getStatusColor(property.status) as any}
                  size="small"
                />
              </Box>

              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Habitaciones
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {property.bedrooms}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Baños
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {property.bathrooms}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Área
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {property.total_area} m²
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Precio Renta
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    ${property.rent_price?.toLocaleString() || 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    Vistas
                  </Typography>
                  <Typography variant="body2">
                    {property.views_count}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Ver">
                    <IconButton size="small" onClick={() => handleView(property.id)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleEdit(property.id)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Favorito">
                    <IconButton 
                      size="small" 
                      onClick={() => handleToggleFavorite(property.id)}
                    >
                      {property.is_favorited ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Checkbox
                  checked={selectedRows.includes(property.id)}
                  onChange={() => handleSelectRow(property.id)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && !authLoading) {
    // User not authenticated
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

  // Si está cargando la autenticación
  if (authLoading) {
    // Loading authentication state
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    );
  }

  if (isLoading) {
    // Loading properties data
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    console.error('❌ PropertyList: Error al cargar propiedades:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar las propiedades
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Detalles del error: {error.message || 'Error desconocido'}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </Box>
    );
  }

  // Rendering properties list

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Propiedades ({filteredProperties.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Nueva Propiedad
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} lg={3}>
            <TextField
              fullWidth
              label="Buscar"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={6} sm={6} lg={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.property_type}
                label="Tipo"
                onChange={(e) => handleFilterChange('property_type', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {availableFilters?.property_types && 
                  Object.entries(availableFilters.property_types).map(([key, value]) => (
                    <MenuItem key={key} value={key}>{String(value)}</MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={6} lg={2}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status}
                label="Estado"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {availableFilters?.statuses && 
                  Object.entries(availableFilters.statuses).map(([key, value]) => (
                    <MenuItem key={key} value={key}>{String(value)}</MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={6} lg={2}>
            <TextField
              fullWidth
              label="Precio Mín"
              type="number"
              value={filters.min_price}
              onChange={(e) => handleFilterChange('min_price', e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={6} lg={2}>
            <TextField
              fullWidth
              label="Precio Máx"
              type="number"
              value={filters.max_price}
              onChange={(e) => handleFilterChange('max_price', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={12} lg={1} sx={{ textAlign: 'center' }}>
            <Tooltip title="Limpiar filtros">
              <IconButton onClick={clearFilters}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            {selectedRows.length} propiedades seleccionadas
            <Button
              size="small"
              color="error"
              onClick={handleBulkDelete}
              sx={{ ml: 2 }}
            >
              Eliminar Seleccionadas
            </Button>
          </Alert>
        </Box>
      )}

      {/* Content - Responsive Table/Cards */}
      {isMobile ? (
        <Box>
          {renderMobileCards()}
          <Paper sx={{ mt: 2 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProperties.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </Paper>
        </Box>
      ) : (
        <Card>
          <TableContainer>
            <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < filteredProperties.length}
                    checked={selectedRows.length === filteredProperties.length && filteredProperties.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Habs</TableCell>
                <TableCell>Baños</TableCell>
                <TableCell>Área</TableCell>
                <TableCell>Precio Renta</TableCell>
                <TableCell>Precio Venta</TableCell>
                <TableCell>Vistas</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProperties.map((property) => (
                <TableRow key={property.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.includes(property.id)}
                      onChange={() => handleSelectRow(property.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {property.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.address}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPropertyTypeLabel(property.property_type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={property.status}
                      color={getStatusColor(property.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{property.bedrooms}</TableCell>
                  <TableCell>{property.bathrooms}</TableCell>
                  <TableCell>{property.total_area} m²</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ${property.rent_price?.toLocaleString() || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ${property.sale_price?.toLocaleString() || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>{property.views_count}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Ver">
                        <IconButton size="small" onClick={() => handleView(property.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(property.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Favorito">
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleFavorite(property.id)}
                        >
                          {property.is_favorited ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDelete(property.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredProperties.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
        </Card>
      )}

      {filteredProperties.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No hay propiedades disponibles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Crea tu primera propiedad haciendo clic en "Nueva Propiedad"
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PropertyList; 