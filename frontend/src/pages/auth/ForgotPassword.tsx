import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Link,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Por favor, ingrese su correo electrónico');
      return;
    }

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError('Error al enviar el correo de restablecimiento. Por favor, intente nuevamente.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Recuperar Contraseña
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }} align="center">
            Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Se ha enviado un correo electrónico con instrucciones para restablecer su contraseña.
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              disabled={success}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              disabled={success}
            >
              Enviar Instrucciones
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
              sx={{ cursor: 'pointer' }}
            >
              Volver al inicio de sesión
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}; 