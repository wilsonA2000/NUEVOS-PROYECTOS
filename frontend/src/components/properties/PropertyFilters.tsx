/**
 * PropertyFilters component
 * Extracted from PropertyList.tsx to handle all filtering logic
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { PropertySearchFilters } from '../../types/property';

interface PropertyFiltersProps {
  filters: PropertySearchFilters;
  onFilterChange: (key: keyof PropertySearchFilters, value: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const propertyTypes = [
    { value: 'apartment', label: 'Apartamento' },
    { value: 'house', label: 'Casa' },
    { value: 'studio', label: 'Estudio' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'office', label: 'Oficina' },
    { value: 'warehouse', label: 'Bodega' },
    { value: 'land', label: 'Terreno' },
  ];

  const statuses = [
    { value: 'available', label: 'Disponible' },
    { value: 'rented', label: 'Arrendada' },
    { value: 'maintenance', label: 'En mantenimiento' },
    { value: 'sold', label: 'Vendida' },
  ];

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" component="h2">
          Filtros
        </Typography>
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
          >
            Limpiar Filtros
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Search */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Buscar propiedades"
            variant="outlined"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            placeholder="Nombre, descripción, ubicación..."
          />
        </Grid>

        {/* Property Type */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Tipo de Propiedad</InputLabel>
            <Select
              value={filters.property_type || ''}
              onChange={(e) => onFilterChange('property_type', e.target.value)}
              label="Tipo de Propiedad"
            >
              <MenuItem value="">Todos</MenuItem>
              {propertyTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Estado</InputLabel>
            <Select
              value={filters.status || ''}
              onChange={(e) => onFilterChange('status', e.target.value)}
              label="Estado"
            >
              <MenuItem value="">Todos</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* City */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Ciudad"
            variant="outlined"
            value={filters.city || ''}
            onChange={(e) => onFilterChange('city', e.target.value)}
            placeholder="Ej: Medellín, Bogotá..."
          />
        </Grid>

        {/* Price Range */}
        <Grid item xs={12} md={4}>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              label="Precio Mín"
              variant="outlined"
              type="number"
              value={filters.min_price || ''}
              onChange={(e) => onFilterChange('min_price', e.target.value)}
              placeholder="0"
            />
            <TextField
              fullWidth
              label="Precio Máx"
              variant="outlined"
              type="number"
              value={filters.max_price || ''}
              onChange={(e) => onFilterChange('max_price', e.target.value)}
              placeholder="Sin límite"
            />
          </Box>
        </Grid>

        {/* Area Range */}
        <Grid item xs={12} md={4}>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              label="Área Mín (m²)"
              variant="outlined"
              type="number"
              value={filters.min_area || ''}
              onChange={(e) => onFilterChange('min_area', e.target.value)}
              placeholder="0"
            />
            <TextField
              fullWidth
              label="Área Máx (m²)"
              variant="outlined"
              type="number"
              value={filters.max_area || ''}
              onChange={(e) => onFilterChange('max_area', e.target.value)}
              placeholder="Sin límite"
            />
          </Box>
        </Grid>

        {/* Bedrooms */}
        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            label="Habitaciones Mín"
            variant="outlined"
            type="number"
            value={filters.min_bedrooms || ''}
            onChange={(e) => onFilterChange('min_bedrooms', e.target.value)}
            placeholder="0"
          />
        </Grid>

        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            label="Habitaciones Máx"
            variant="outlined"
            type="number"
            value={filters.max_bedrooms || ''}
            onChange={(e) => onFilterChange('max_bedrooms', e.target.value)}
            placeholder="Sin límite"
          />
        </Grid>

        {/* Bathrooms */}
        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            label="Baños Mín"
            variant="outlined"
            type="number"
            value={filters.min_bathrooms || ''}
            onChange={(e) => onFilterChange('min_bathrooms', e.target.value)}
            placeholder="0"
          />
        </Grid>

        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            label="Baños Máx"
            variant="outlined"
            type="number"
            value={filters.max_bathrooms || ''}
            onChange={(e) => onFilterChange('max_bathrooms', e.target.value)}
            placeholder="Sin límite"
          />
        </Grid>

        {/* Features */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" gutterBottom>
            Características
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.has_parking || false}
                  onChange={(e) => onFilterChange('has_parking', e.target.checked ? true : undefined)}
                />
              }
              label="Parqueadero"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.has_pool || false}
                  onChange={(e) => onFilterChange('has_pool', e.target.checked ? true : undefined)}
                />
              }
              label="Piscina"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.allows_pets || false}
                  onChange={(e) => onFilterChange('allows_pets', e.target.checked ? true : undefined)}
                />
              }
              label="Permite Mascotas"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.is_furnished || false}
                  onChange={(e) => onFilterChange('is_furnished', e.target.checked ? true : undefined)}
                />
              }
              label="Amoblada"
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PropertyFilters;