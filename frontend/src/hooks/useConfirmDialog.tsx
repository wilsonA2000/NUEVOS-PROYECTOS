import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'success' | 'warning';
}

interface ConfirmState {
  open: boolean;
  message: string;
  options: ConfirmOptions;
}

export const useConfirmDialog = () => {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: '',
    options: {},
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}): Promise<boolean> => {
      return new Promise<boolean>(resolve => {
        resolveRef.current = resolve;
        setState({ open: true, message, options });
      });
    },
    [],
  );

  const handleClose = useCallback((result: boolean) => {
    setState(prev => ({ ...prev, open: false }));
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(
    () => (
      <Dialog
        open={state.open}
        onClose={() => handleClose(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{state.options.title || 'Confirmar acción'}</DialogTitle>
        <DialogContent>
          <DialogContentText>{state.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(false)} color='inherit'>
            {state.options.cancelText || 'Cancelar'}
          </Button>
          <Button
            onClick={() => handleClose(true)}
            color={state.options.confirmColor || 'primary'}
            variant='contained'
            autoFocus
          >
            {state.options.confirmText || 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    ),
    [state, handleClose],
  );

  return { confirm, ConfirmDialog };
};
