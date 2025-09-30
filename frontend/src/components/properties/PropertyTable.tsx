/**
 * PropertyTable component
 * Professional desktop table view for properties with advanced features:
 * - Sorting by columns
 * - Row selection with checkboxes
 * - Bulk actions
 * - Responsive design
 * - Performance optimized with virtualization
 * - Modern UI with hover effects and smooth animations
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Box,
  Typography,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Skeleton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  MoreVert as MoreIcon,
  DeleteSweep as BulkDeleteIcon,
  VisibilityOff as HideIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { Property } from '../../types/property';
import { User } from '../../types/user';
import PropertyImage from '../common/PropertyImage';
import PropertyTableSkeleton from './PropertyTableSkeleton';

type SortOrder = 'asc' | 'desc';
type SortableColumns = 'title' | 'property_type' | 'price' | 'city' | 'bedrooms' | 'bathrooms' | 'total_area' | 'status' | 'created_at';

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
  onToggleFavorite?: (id: string) => void;
  userType: string;
  currentUser: User | null;
  loading?: boolean;
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  // New advanced props
  onBulkDelete?: (ids: string[]) => void;
  onBulkToggleFavorite?: (ids: string[]) => void;
  sortBy?: SortableColumns;
  sortOrder?: SortOrder;
  onSort?: (column: SortableColumns) => void;
  enableSelection?: boolean;
  enableBulkActions?: boolean;
  compactMode?: boolean;
}

const PropertyTable: React.FC<PropertyTableProps> = memo(({
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
  currentUser,
  loading = false,
  selected = [],
  onSelectionChange,
  onBulkDelete,
  onBulkToggleFavorite,
  sortBy,
  sortOrder = 'asc',
  onSort,
  enableSelection = false,
  enableBulkActions = false,
  compactMode = false,
}) => {
  console.log('🔥 PropertyTable ACTUALIZADO rendering with properties:', properties?.length || 0);
  console.log('🔥 First property image data:', properties?.[0]?.images?.[0]);
  console.log('🔥 First property main_image_url:', properties?.[0]?.main_image_url);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Local state for bulk actions menu
  const [bulkActionsAnchor, setBulkActionsAnchor] = useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  // Memoized utility functions
  const getStatusColor = useCallback((status: string): 'success' | 'primary' | 'warning' | 'error' => {
    switch (status) {
      case 'available':
        return 'success';
      case 'rented':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'sold':
      case 'inactive':
        return 'error';
      default:
        return 'primary';
    }
  }, []);

  const getStatusText = useCallback((status: string): string => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'rented':
        return 'Arrendada';
      case 'maintenance':
        return 'Mantenimiento';
      case 'sold':
        return 'Vendida';
      case 'inactive':
        return 'Inactiva';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  }, []);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  }, []);

  // Selection handlers
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (event.target.checked) {
        const allIds = properties.map(p => p.id.toString());
        onSelectionChange(allIds);
      } else {
        onSelectionChange([]);
      }
    }
  }, [properties, onSelectionChange]);

  const handleSelectRow = useCallback((id: string) => {
    if (onSelectionChange) {
      const newSelected = selected.includes(id)
        ? selected.filter(selectedId => selectedId !== id)
        : [...selected, id];
      onSelectionChange(newSelected);
    }
  }, [selected, onSelectionChange]);

  // Sorting handler
  const handleSort = useCallback((column: SortableColumns) => {
    if (onSort) {
      onSort(column);
    }
  }, [onSort]);

  // Bulk actions handlers
  const handleBulkActionsClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setBulkActionsAnchor(event.currentTarget);
  }, []);

  const handleBulkActionsClose = useCallback(() => {
    setBulkActionsAnchor(null);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete && selected.length > 0) {
      onBulkDelete(selected);
    }
    handleBulkActionsClose();
  }, [onBulkDelete, selected, handleBulkActionsClose]);

  const handleBulkToggleFavorite = useCallback(() => {
    if (onBulkToggleFavorite && selected.length > 0) {
      onBulkToggleFavorite(selected);
    }
    handleBulkActionsClose();
  }, [onBulkToggleFavorite, selected, handleBulkActionsClose]);

  // Memoized values
  const isAllSelected = useMemo(() => {
    return properties.length > 0 && selected.length === properties.length;
  }, [properties.length, selected.length]);

  const isIndeterminate = useMemo(() => {
    return selected.length > 0 && selected.length < properties.length;
  }, [selected.length, properties.length]);

  const hasSelection = selected.length > 0;

  // Get price for sorting and display
  const getPropertyPrice = useCallback((property: Property): number => {
    return property.rent_price || property.sale_price || 0;
  }, []);

  // Column visibility based on screen size
  const visibleColumns = useMemo(() => {
    const base = ['image', 'title', 'price', 'status', 'actions'];
    
    if (!isMobile) {
      base.splice(2, 0, 'type');
      base.splice(4, 0, 'location');
    }
    
    if (!isTablet) {
      base.splice(-2, 0, 'rooms', 'area');
    }
    
    if (enableSelection) {
      base.unshift('checkbox');
    }
    
    return base;
  }, [isMobile, isTablet, enableSelection]);

  // Loading skeleton
  if (loading) {
    return (
      <PropertyTableSkeleton
        rows={Math.min(rowsPerPage, 10)}
        showCheckbox={enableSelection}
        showActions={true}
        compactMode={compactMode}
      />
    );
  }

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        background: theme.palette.background.paper,
        '& .MuiTableContainer-root': {
          maxHeight: compactMode ? 400 : 600,
        }
      }}
    >
      {/* Bulk Actions Toolbar */}
      {enableBulkActions && hasSelection && (
        <Fade in={hasSelection}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              backgroundColor: theme.palette.primary.main + '08',
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {selected.length} propiedades seleccionadas
            </Typography>
            <Box>
              <Button
                startIcon={<MoreIcon />}
                onClick={handleBulkActionsClick}
                variant="outlined"
                size="small"
              >
                Acciones
              </Button>
              <Menu
                anchorEl={bulkActionsAnchor}
                open={Boolean(bulkActionsAnchor)}
                onClose={handleBulkActionsClose}
              >
                {userType === 'tenant' && onBulkToggleFavorite && (
                  <MenuItem onClick={handleBulkToggleFavorite}>
                    <StarIcon sx={{ mr: 1 }} fontSize="small" />
                    Agregar a favoritos
                  </MenuItem>
                )}
                {userType === 'landlord' && onBulkDelete && (
                  <MenuItem onClick={handleBulkDelete} sx={{ color: 'error.main' }}>
                    <BulkDeleteIcon sx={{ mr: 1 }} fontSize="small" />
                    Eliminar seleccionadas
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Box>
        </Fade>
      )}

      <TableContainer>
        <Table stickyHeader size={compactMode ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {visibleColumns.includes('checkbox') && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    size="small"
                  />
                </TableCell>
              )}
              
              {visibleColumns.includes('image') && (
                <TableCell>Imagen</TableCell>
              )}
              
              {visibleColumns.includes('title') && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'title'}
                    direction={sortBy === 'title' ? sortOrder : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Título
                  </TableSortLabel>
                </TableCell>
              )}
              
              {visibleColumns.includes('type') && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'property_type'}
                    direction={sortBy === 'property_type' ? sortOrder : 'asc'}
                    onClick={() => handleSort('property_type')}
                  >
                    Tipo
                  </TableSortLabel>
                </TableCell>
              )}
              
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'price'}
                  direction={sortBy === 'price' ? sortOrder : 'asc'}
                  onClick={() => handleSort('price')}
                >
                  Precio
                </TableSortLabel>
              </TableCell>
              
              {visibleColumns.includes('location') && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'city'}
                    direction={sortBy === 'city' ? sortOrder : 'asc'}
                    onClick={() => handleSort('city')}
                  >
                    Ubicación
                  </TableSortLabel>
                </TableCell>
              )}
              
              {visibleColumns.includes('rooms') && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'bedrooms'}
                    direction={sortBy === 'bedrooms' ? sortOrder : 'asc'}
                    onClick={() => handleSort('bedrooms')}
                  >
                    Hab/Baños
                  </TableSortLabel>
                </TableCell>
              )}
              
              {visibleColumns.includes('area') && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'total_area'}
                    direction={sortBy === 'total_area' ? sortOrder : 'asc'}
                    onClick={() => handleSort('total_area')}
                  >
                    Área
                  </TableSortLabel>
                </TableCell>
              )}
              
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'status'}
                  direction={sortBy === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Estado
                </TableSortLabel>
              </TableCell>
              
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {properties.map((property, index) => {
              const propertyId = property.id.toString();
              const isSelected = selected.includes(propertyId);
              const isHovered = hoveredRow === propertyId;
              const canEdit = userType === 'landlord' && 
                (currentUser?.email === property.landlord?.email || 
                 currentUser?.is_superuser || 
                 currentUser?.role === 'admin');

              return (
                <TableRow 
                  key={property.id}
                  hover
                  selected={isSelected}
                  onMouseEnter={() => setHoveredRow(propertyId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover + '40',
                    },
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.primary.main + '08',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main + '12',
                      },
                    },
                    // Zebra striping
                    '&:nth-of-type(even)': {
                      backgroundColor: theme.palette.action.hover + '20',
                    }
                  }}
                >
                  {/* Checkbox */}
                  {visibleColumns.includes('checkbox') && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(propertyId)}
                        size="small"
                      />
                    </TableCell>
                  )}

                  {/* Image */}
                  {visibleColumns.includes('image') && (
                    <TableCell>
                      <Zoom in timeout={200}>
                        <Box 
                          sx={{ 
                            width: compactMode ? 60 : 80, 
                            height: compactMode ? 45 : 60,
                            borderRadius: 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            }
                          }}
                          onClick={() => onView(propertyId)}
                        >
                          <PropertyImage
                            src={(() => {
                              const imageSrc = property.main_image_url || 
                                (property.images && property.images.length > 0 
                                  ? property.images[0].image_url || property.images[0].image || '/placeholder-property.jpg'
                                  : '/placeholder-property.jpg');
                              console.log(`🖼️ PropertyTable Image for ${property.title}:`, {
                                main_image_url: property.main_image_url,
                                images_count: property.images?.length || 0,
                                first_image: property.images?.[0],
                                first_image_url: property.images?.[0]?.image_url,
                                final_src: imageSrc,
                                full_property: property
                              });
                              console.log(`🔍 Image URL being used:`, imageSrc);
                              return imageSrc;
                            })()}
                            alt={property.title}
                            width={compactMode ? 60 : 80}
                            height={compactMode ? 45 : 60}
                            style={{ borderRadius: 4, objectFit: 'cover' }}
                            placeholder
                            progressive
                          />
                        </Box>
                      </Zoom>
                    </TableCell>
                  )}

                  {/* Title */}
                  {visibleColumns.includes('title') && (
                    <TableCell onClick={() => onView(propertyId)}>
                      <Typography 
                        variant={compactMode ? 'body2' : 'subtitle2'} 
                        sx={{ 
                          fontWeight: 600,
                          mb: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          '&:hover': {
                            color: theme.palette.primary.main,
                          }
                        }}
                      >
                        {property.title}
                      </Typography>
                      {!compactMode && (
                        <Typography variant="caption" color="text.secondary">
                          {property.description?.substring(0, 40)}...
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {/* Type */}
                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <Chip
                        label={property.property_type}
                        size={compactMode ? 'small' : 'medium'}
                        variant="outlined"
                        sx={{
                          textTransform: 'capitalize',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                  )}

                  {/* Price */}
                  <TableCell>
                    <Typography 
                      variant={compactMode ? 'body2' : 'subtitle2'} 
                      sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
                    >
                      {formatPrice(getPropertyPrice(property))}
                    </Typography>
                    {!compactMode && property.listing_type === 'rent' && (
                      <Typography variant="caption" color="text.secondary">
                        /mes
                      </Typography>
                    )}
                  </TableCell>

                  {/* Location */}
                  {visibleColumns.includes('location') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {property.city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.state}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Rooms */}
                  {visibleColumns.includes('rooms') && (
                    <TableCell>
                      <Typography variant="body2">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {property.bedrooms}
                        </Box>
                        {' hab / '}
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {property.bathrooms}
                        </Box>
                        {' baños'}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Area */}
                  {visibleColumns.includes('area') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {property.total_area?.toLocaleString()} m²
                      </Typography>
                    </TableCell>
                  )}

                  {/* Status */}
                  <TableCell>
                    <Chip
                      label={getStatusText(property.status)}
                      color={getStatusColor(property.status)}
                      size={compactMode ? 'small' : 'medium'}
                      variant="filled"
                      sx={{
                        fontWeight: 600,
                        minWidth: 85,
                      }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="center">
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        gap: 0.5, 
                        justifyContent: 'center',
                        opacity: isHovered ? 1 : 0.7,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <Tooltip title="Ver detalles" arrow>
                        <IconButton
                          size={compactMode ? 'small' : 'medium'}
                          onClick={() => onView(propertyId)}
                          sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: theme.palette.primary.main + '10',
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {userType === 'tenant' && onToggleFavorite && (
                        <Tooltip title={property.is_favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'} arrow>
                          <IconButton
                            size={compactMode ? 'small' : 'medium'}
                            onClick={() => onToggleFavorite(propertyId)}
                            sx={{
                              color: property.is_favorited ? theme.palette.error.main : theme.palette.action.active,
                              '&:hover': {
                                backgroundColor: theme.palette.error.main + '10',
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            {property.is_favorited ? (
                              <FavoriteIcon fontSize="small" />
                            ) : (
                              <FavoriteBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}

                      {canEdit && (
                        <>
                          <Tooltip title="Editar" arrow>
                            <IconButton
                              size={compactMode ? 'small' : 'medium'}
                              onClick={() => onEdit(propertyId)}
                              sx={{
                                color: theme.palette.warning.main,
                                '&:hover': {
                                  backgroundColor: theme.palette.warning.main + '10',
                                  transform: 'scale(1.1)',
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar" arrow>
                            <IconButton
                              size={compactMode ? 'small' : 'medium'}
                              onClick={() => onDelete(propertyId)}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                  backgroundColor: theme.palette.error.main + '10',
                                  transform: 'scale(1.1)',
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {properties.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length} 
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No se encontraron propiedades
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Intenta ajustar los filtros o buscar con otros términos
                  </Typography>
                </TableCell>
              </TableRow>
            )}
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
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          '.MuiTablePagination-toolbar': {
            paddingX: 2,
          },
        }}
      />
    </Paper>
  );
});

// Display name for debugging
PropertyTable.displayName = 'PropertyTable';

export default PropertyTable;
export type { PropertyTableProps, SortableColumns, SortOrder };