import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';

interface SnackbarMessage {
  id: number;
  message: string;
  severity: AlertColor;
  duration: number;
}

interface SnackbarContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined,
);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction='up' />;
}

let messageId = 0;

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const addMessage = useCallback((message: string, severity: AlertColor) => {
    const duration =
      severity === 'error' || severity === 'warning' ? 6000 : 4000;
    const id = ++messageId;
    setMessages(prev => [...prev, { id, message, severity, duration }]);
  }, []);

  const removeMessage = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => addMessage(message, 'success'),
    [addMessage],
  );
  const showError = useCallback(
    (message: string) => addMessage(message, 'error'),
    [addMessage],
  );
  const showWarning = useCallback(
    (message: string) => addMessage(message, 'warning'),
    [addMessage],
  );
  const showInfo = useCallback(
    (message: string) => addMessage(message, 'info'),
    [addMessage],
  );

  return (
    <SnackbarContext.Provider
      value={{ showSuccess, showError, showWarning, showInfo }}
    >
      {children}
      {messages.map((msg, index) => (
        <Snackbar
          key={msg.id}
          open={true}
          autoHideDuration={msg.duration}
          onClose={() => removeMessage(msg.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          TransitionComponent={SlideTransition}
          sx={{ bottom: { xs: 24 + index * 60, sm: 24 + index * 60 } }}
        >
          <Alert
            onClose={() => removeMessage(msg.id)}
            severity={msg.severity}
            variant='filled'
            sx={{ width: '100%', minWidth: 300, boxShadow: 3 }}
          >
            {msg.message}
          </Alert>
        </Snackbar>
      ))}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export default SnackbarContext;
