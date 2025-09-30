/**
 * PropertyTableSkeleton - Optimized loading skeleton for PropertyTable
 * Provides smooth loading states with proper spacing and animations
 */

import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
  useTheme,
} from '@mui/material';

interface PropertyTableSkeletonProps {
  rows?: number;
  showCheckbox?: boolean;
  showActions?: boolean;
  compactMode?: boolean;
}

const PropertyTableSkeleton: React.FC<PropertyTableSkeletonProps> = memo(({
  rows = 5,
  showCheckbox = false,
  showActions = true,
  compactMode = false,
}) => {
  const theme = useTheme();

  const renderSkeletonRows = () => {
    return Array.from({ length: rows }).map((_, index) => (
      <TableRow key={index}>
        {/* Checkbox */}
        {showCheckbox && (
          <TableCell padding="checkbox">
            <Skeleton 
              variant="rectangular" 
              width={18} 
              height={18} 
              sx={{ borderRadius: 0.5 }}
            />
          </TableCell>
        )}

        {/* Image */}
        <TableCell>
          <Skeleton 
            variant="rectangular" 
            width={compactMode ? 60 : 80} 
            height={compactMode ? 45 : 60}
            sx={{ borderRadius: 1 }}
          />
        </TableCell>

        {/* Title */}
        <TableCell>
          <Skeleton variant="text" width="80%" height={24} />
          {!compactMode && (
            <Skeleton variant="text" width="60%" height={18} sx={{ mt: 0.5 }} />
          )}
        </TableCell>

        {/* Type */}
        <TableCell>
          <Skeleton 
            variant="rectangular" 
            width={80} 
            height={24}
            sx={{ borderRadius: 12 }}
          />
        </TableCell>

        {/* Price */}
        <TableCell>
          <Skeleton variant="text" width={90} height={24} />
          {!compactMode && (
            <Skeleton variant="text" width={40} height={18} sx={{ mt: 0.5 }} />
          )}
        </TableCell>

        {/* Location */}
        <TableCell>
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="50%" height={16} sx={{ mt: 0.5 }} />
        </TableCell>

        {/* Rooms */}
        <TableCell>
          <Skeleton variant="text" width={80} height={20} />
        </TableCell>

        {/* Area */}
        <TableCell>
          <Skeleton variant="text" width={60} height={20} />
        </TableCell>

        {/* Status */}
        <TableCell>
          <Skeleton 
            variant="rectangular" 
            width={85} 
            height={24}
            sx={{ borderRadius: 12 }}
          />
        </TableCell>

        {/* Actions */}
        {showActions && (
          <TableCell align="center">
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <Paper 
      elevation={1}
      sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        background: theme.palette.background.paper,
      }}
    >
      <TableContainer>
        <Table size={compactMode ? 'small' : 'medium'}>
          {/* Header skeleton */}
          <TableHead>
            <TableRow>
              {showCheckbox && (
                <TableCell padding="checkbox">
                  <Skeleton 
                    variant="rectangular" 
                    width={18} 
                    height={18}
                    sx={{ borderRadius: 0.5 }}
                  />
                </TableCell>
              )}
              {['Imagen', 'Título', 'Tipo', 'Precio', 'Ubicación', 'Hab/Baños', 'Área', 'Estado'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" width="70%" height={20} />
                </TableCell>
              ))}
              {showActions && (
                <TableCell align="center">
                  <Skeleton variant="text" width={60} height={20} />
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          {/* Body skeleton */}
          <TableBody>
            {renderSkeletonRows()}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination skeleton */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Skeleton variant="text" width={120} height={20} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="text" width={150} height={20} />
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
});

PropertyTableSkeleton.displayName = 'PropertyTableSkeleton';

export default PropertyTableSkeleton;