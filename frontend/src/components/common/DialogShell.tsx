/**
 * DialogShell — modal unificado con header, content y actions consistentes.
 *
 * Normaliza padding, tipografía del título y cierre para reemplazar los
 * 314 <Dialog> ad-hoc identificados en auditoría VIS-1.
 *
 * Uso:
 *   <DialogShell
 *     open={open}
 *     onClose={handleClose}
 *     icon={<EditIcon />}
 *     title="Editar contrato"
 *     subtitle="Modificaciones al borrador"
 *     actions={<><Button onClick={handleClose}>Cancelar</Button><Button variant="contained">Guardar</Button></>}
 *   >
 *     {content}
 *   </DialogShell>
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Stack,
  Typography,
  DialogProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { vh } from '../../theme/tokens';

export interface DialogShellProps extends Omit<DialogProps, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  hideCloseButton?: boolean;
  onClose?: () => void;
}

const DialogShell: React.FC<DialogShellProps> = ({
  icon,
  title,
  subtitle,
  actions,
  children,
  hideCloseButton,
  onClose,
  PaperProps,
  ...rest
}) => {
  return (
    <Dialog
      onClose={onClose}
      {...rest}
      PaperProps={{
        ...PaperProps,
        sx: {
          borderRadius: `${vh.radius.lg}px`,
          boxShadow: vh.shadows.elevated,
          overflow: 'hidden',
          ...PaperProps?.sx,
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          px: 3,
          py: 2.5,
          background: vh.gradients.subtle,
          borderBottom: vh.border.subtle,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: `${vh.radius.md}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {!hideCloseButton && onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Cerrar"
              sx={{ ml: 'auto' }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 3 }}>{children}</DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: vh.border.subtle, gap: 1 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default DialogShell;
