/**
 * EmptyState — estado vacío unificado (reemplaza <Alert> usados como empty).
 *
 * Uso:
 *   <EmptyState
 *     icon={<InboxIcon />}
 *     title="No hay solicitudes pendientes"
 *     message="Las nuevas solicitudes aparecerán aquí..."
 *     action={<Button variant="contained">Crear primera</Button>}
 *   />
 */
import React from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { vh } from '../../theme/tokens';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => (
  <Box
    sx={{
      textAlign: 'center',
      py: { xs: 5, md: 7 },
      px: 3,
      borderRadius: `${vh.radius.lg}px`,
      border: vh.border.subtle,
      background: vh.gradients.surface,
    }}
  >
    <Stack spacing={2} alignItems='center'>
      <Avatar
        sx={{
          width: 72,
          height: 72,
          bgcolor: 'action.hover',
          color: 'text.secondary',
          '& svg': { fontSize: 36 },
        }}
      >
        {icon}
      </Avatar>
      <Typography variant='h6' color='text.primary' sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {message && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ maxWidth: 420 }}
        >
          {message}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  </Box>
);

export default EmptyState;
