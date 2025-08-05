/**
 * PropertyTable component
 * Desktop table view for properties - extracted from PropertyList.tsx
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { Property } from '../../types/property';
import PropertyImage from '../common/PropertyImage';

interface PropertyTableProps {
  properties: Property[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  userType: string;
}

const PropertyTable: React.FC<PropertyTableProps> = ({
  properties,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  userType,
}) => {
  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' => {
    switch (status) {
      case 'available':
        return 'success';
      case 'rented':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'sold':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'rented':
        return 'Arrendada';
      case 'maintenance':
        return 'Mantenimiento';
      case 'sold':
        return 'Vendida';
      default:
        return status;
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Paper elevation={1}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Imagen</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Hab/Baños</TableCell>
              <TableCell>Área</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} hover>
                {/* Image */}
                <TableCell>
                  <Box sx={{ width: 80, height: 60 }}>
                    <PropertyImage
                      src={property.images?.[0] || ''}
                      alt={property.title}
                      width={80}
                      height={60}
                      style={{ borderRadius: 4 }}
                    />
                  </Box>
                </TableCell>

                {/* Title */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {property.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {property.description?.substring(0, 50)}...
                  </Typography>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <Chip
                    label={property.property_type}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>

                {/* Price */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatPrice(property.price)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {property.price_type === 'rent' ? '/mes' : ''}
                  </Typography>
                </TableCell>

                {/* Location */}
                <TableCell>
                  <Typography variant="body2">
                    {property.city}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {property.neighborhood}
                  </Typography>
                </TableCell>

                {/* Rooms */}
                <TableCell>
                  <Typography variant="body2">
                    {property.bedrooms}H / {property.bathrooms}B
                  </Typography>
                </TableCell>

                {/* Area */}
                <TableCell>
                  <Typography variant="body2">
                    {property.area} m²
                  </Typography>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Chip
                    label={getStatusText(property.status)}
                    color={getStatusColor(property.status)}
                    size="small"
                  />
                </TableCell>

                {/* Actions */}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Ver detalles">
                      <IconButton
                        size="small"
                        onClick={() => onView(property.id.toString())}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {userType === 'tenant' && (
                      <Tooltip title="Agregar a favoritos">
                        <IconButton
                          size="small"
                          onClick={() => onToggleFavorite(property.id.toString())}
                        >
                          {property.is_favorite ? (
                            <FavoriteIcon fontSize="small" color="error" />
                          ) : (
                            <FavoriteBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}

                    {userType === 'landlord' && property.landlord?.id === property.landlord?.id && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(property.id.toString())}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(property.id.toString())}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />
    </Paper>
  );
};

export default PropertyTable;