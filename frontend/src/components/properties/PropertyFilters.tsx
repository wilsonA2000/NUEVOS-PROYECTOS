/**
 * Optimized Compact Property Filters Component
 * Features: Horizontal layout, collapsible advanced filters, real-time filtering
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Badge,
  Collapse,
  Divider,
  Stack,
  Autocomplete,
  Slider,
  Typography,
  useMediaQuery,
  useTheme,
  Modal,
  Fade,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Tune as TuneIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { PropertySearchFilters } from '../../types/property';

interface PropertyFiltersProps {
  filters: PropertySearchFilters;
  onFilterChange: (key: keyof PropertySearchFilters, value: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onApplyFilters?: () => void;
  isLoading?: boolean;
  autoApply?: boolean; // Auto-apply filters on change
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento', icon: '🏢' },
  { value: 'house', label: 'Casa', icon: '🏠' },
  { value: 'studio', label: 'Estudio', icon: '🏙️' },
  { value: 'penthouse', label: 'Penthouse', icon: '🏗️' },
  { value: 'townhouse', label: 'Casa Conjunto', icon: '🏘️' },
  { value: 'commercial', label: 'Comercial', icon: '🏪' },
  { value: 'office', label: 'Oficina', icon: '🏢' },
  { value: 'warehouse', label: 'Bodega', icon: '🏭' },
  { value: 'land', label: 'Terreno', icon: '🌾' },
  { value: 'room', label: 'Habitación', icon: '🛏️' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible', color: '#4caf50' },
  { value: 'rented', label: 'Arrendada', color: '#ff9800' },
  { value: 'maintenance', label: 'Mantenimiento', color: '#2196f3' },
  { value: 'pending', label: 'Pendiente', color: '#9c27b0' },
  { value: 'inactive', label: 'Inactiva', color: '#f44336' },
];

const FEATURE_CHIPS = [
  { key: 'has_parking', label: 'Parqueadero', icon: '🅿️' },
  { key: 'has_pool', label: 'Piscina', icon: '🏊' },
  { key: 'allows_pets', label: 'Mascotas', icon: '🐕' },
  { key: 'is_furnished', label: 'Amoblada', icon: '🛋️' },
];

const COLOMBIAN_CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 
  'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Ibagué',
  'Pasto', 'Villavicencio', 'Montería', 'Valledupar', 'Neiva'
];

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  onApplyFilters,
  isLoading = false,
  autoApply = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  
  // Debounced filter application
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  const handleFilterChange = useCallback((key: keyof PropertySearchFilters, value: any) => {
    onFilterChange(key, value);
    
    if (autoApply) {
      if (timeoutId) clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(() => {
        onApplyFilters?.();
      }, 500);
      setTimeoutId(newTimeoutId);
    }
  }, [onFilterChange, onApplyFilters, autoApply, timeoutId]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.property_type) count++;
    if (filters.status) count++;
    if (filters.city) count++;
    if (filters.min_price || filters.max_price) count++;
    if (filters.min_area || filters.max_area) count++;
    if (filters.min_bedrooms || filters.max_bedrooms) count++;
    if (filters.min_bathrooms || filters.max_bathrooms) count++;
    if (filters.has_parking || filters.has_pool || filters.allows_pets || filters.is_furnished) count++;
    return count;
  }, [filters]);

  const advancedFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.min_price || filters.max_price) count++;
    if (filters.min_area || filters.max_area) count++;
    if (filters.min_bedrooms || filters.max_bedrooms) count++;
    if (filters.min_bathrooms || filters.max_bathrooms) count++;
    return count;
  }, [filters]);

  const featuresCount = useMemo(() => {
    let count = 0;
    if (filters.has_parking) count++;
    if (filters.has_pool) count++;
    if (filters.allows_pets) count++;
    if (filters.is_furnished) count++;
    return count;
  }, [filters]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const renderBasicFilters = () => (
    <Grid container spacing={2} alignItems="center">
      {/* Search Bar */}
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar propiedades..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'grey.50',
            }
          }}
        />
      </Grid>

      {/* Property Type */}
      <Grid item xs={6} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Tipo</InputLabel>
          <Select
            value={filters.property_type || ''}
            onChange={(e) => handleFilterChange('property_type', e.target.value)}
            label="Tipo"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {PROPERTY_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{type.icon}</span>
                  {type.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Status */}
      <Grid item xs={6} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Estado</InputLabel>
          <Select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            label="Estado"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: status.color,
                    }}
                  />
                  {status.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* City */}
      <Grid item xs={12} md={2}>
        <Autocomplete
          size="small"
          options={COLOMBIAN_CITIES}
          value={filters.city || null}
          onChange={(_, newValue) => handleFilterChange('city', newValue)}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ciudad"
              placeholder="Seleccionar..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          )}
        />
      </Grid>

      {/* Action Buttons */}
      <Grid item xs={12} md={2}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="Filtros Avanzados">
            <IconButton
              onClick={() => isMobile ? setShowMobileModal(true) : setShowAdvanced(!showAdvanced)}
              color={showAdvanced || advancedFiltersCount > 0 ? 'primary' : 'default'}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Badge badgeContent={advancedFiltersCount || undefined} color="primary">
                <TuneIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {hasActiveFilters && (
            <Tooltip title="Limpiar Filtros">
              <IconButton
                onClick={onClearFilters}
                size="small"
                color="error"
                sx={{
                  border: '1px solid',
                  borderColor: 'error.main',
                  borderRadius: 2,
                }}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Grid>
    </Grid>
  );

  const renderAdvancedFilters = () => (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Grid container spacing={2} alignItems="center">
        {/* Price Range */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Precio (COP)
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                value={filters.min_price || ''}
                onChange={(e) => handleFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
                InputProps={{
                  startAdornment: <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                value={filters.max_price || ''}
                onChange={(e) => handleFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Box>
        </Grid>

        {/* Area Range */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Área (m²)
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                value={filters.min_area || ''}
                onChange={(e) => handleFilterChange('min_area', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                value={filters.max_area || ''}
                onChange={(e) => handleFilterChange('max_area', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Box>
        </Grid>

        {/* Bedrooms */}
        <Grid item xs={6} md={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Habitaciones
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                value={filters.min_bedrooms || ''}
                onChange={(e) => handleFilterChange('min_bedrooms', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                value={filters.max_bedrooms || ''}
                onChange={(e) => handleFilterChange('max_bedrooms', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Box>
        </Grid>

        {/* Bathrooms */}
        <Grid item xs={6} md={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Baños
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                value={filters.min_bathrooms || ''}
                onChange={(e) => handleFilterChange('min_bathrooms', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                value={filters.max_bathrooms || ''}
                onChange={(e) => handleFilterChange('max_bathrooms', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Box>
        </Grid>

        {/* Action */}
        <Grid item xs={12} md={2}>
          <Stack direction="row" justifyContent="flex-end">
            <IconButton
              onClick={() => setShowAdvanced(false)}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <ExpandIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );

  const renderFeatureChips = () => (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {FEATURE_CHIPS.map((feature) => (
          <Chip
            key={feature.key}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span style={{ fontSize: '0.85em' }}>{feature.icon}</span>
                {feature.label}
              </Box>
            }
            variant={filters[feature.key as keyof PropertySearchFilters] ? 'filled' : 'outlined'}
            color={filters[feature.key as keyof PropertySearchFilters] ? 'primary' : 'default'}
            size="small"
            onClick={() => handleFilterChange(
              feature.key as keyof PropertySearchFilters,
              !filters[feature.key as keyof PropertySearchFilters] ? true : undefined
            )}
            sx={{
              borderRadius: 2,
              '&:hover': { backgroundColor: 'action.hover' },
              cursor: 'pointer',
            }}
          />
        ))}
        {featuresCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
            {featuresCount} filtro{featuresCount !== 1 ? 's' : ''} activo{featuresCount !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>
    </Box>
  );

  const renderMobileModal = () => (
    <Modal
      open={showMobileModal}
      onClose={() => setShowMobileModal(false)}
      closeAfterTransition
    >
      <Fade in={showMobileModal}>
        <Paper
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            right: '5%',
            maxHeight: '80vh',
            overflow: 'auto',
            p: 3,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Filtros Avanzados</Typography>
            <IconButton onClick={() => setShowMobileModal(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          
          <Divider sx={{ mb: 2 }} />
          
          {renderAdvancedFilters()}
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            {!autoApply && (
              <Button
                variant="contained"
                onClick={() => {
                  onApplyFilters?.();
                  setShowMobileModal(false);
                }}
                startIcon={<FilterIcon />}
                fullWidth
              >
                Aplicar Filtros
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => setShowMobileModal(false)}
              fullWidth={autoApply}
            >
              Cerrar
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );

  return (
    <>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          backgroundColor: 'background.paper',
        }}
      >
        {renderBasicFilters()}
        
        {!isMobile && (
          <Collapse in={showAdvanced}>
            {renderAdvancedFilters()}
          </Collapse>
        )}
        
        {renderFeatureChips()}
        
        {activeFiltersCount > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
              </Typography>
              {!autoApply && (
                <>
                  <Divider orientation="vertical" flexItem />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onApplyFilters}
                    disabled={isLoading}
                    startIcon={<FilterIcon />}
                  >
                    Aplicar
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        )}
      </Paper>
      
      {isMobile && renderMobileModal()}
    </>
  );
};

export default PropertyFilters;