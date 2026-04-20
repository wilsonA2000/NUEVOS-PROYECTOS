/**
 * 📜 ADMIN LOGS VIEWER (Plan Maestro V2.0)
 *
 * Visor de logs del sistema con filtros y exportación.
 *
 * Features:
 * - Tabla de actividades con filtros
 * - Filtrar por usuario, acción, fecha
 * - Exportar a CSV/JSON
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';

import { AdminService } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Visor de logs
 */
const AdminLogsViewer: React.FC = () => {
  const { adminPermissions } = useAdminAuth();

  // Estado de filtros
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0] ?? '';
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Mutation para exportar
  const exportMutation = useMutation({
    mutationFn: (format: 'json' | 'csv') =>
      AdminService.exportLogs({
        date_from: dateFrom,
        date_to: dateTo,
        format,
        filter_type: filterType !== 'all' ? filterType : undefined,
      }),
    onSuccess: data => {
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }
    },
  });

  // Datos de ejemplo (en producción vendrían de la API)
  const mockLogs = [
    {
      id: '1',
      timestamp: '2025-12-08T10:30:00',
      user: 'admin@verihome.com',
      action: 'LOGIN',
      status: 'success',
      details: 'Login exitoso',
    },
    {
      id: '2',
      timestamp: '2025-12-08T10:35:00',
      user: 'admin@verihome.com',
      action: 'CONTRACT_APPROVED',
      status: 'success',
      details: 'Contrato #123 aprobado',
    },
    {
      id: '3',
      timestamp: '2025-12-08T11:00:00',
      user: 'landlord@test.com',
      action: 'CONTRACT_CREATED',
      status: 'success',
      details: 'Nuevo contrato creado',
    },
    {
      id: '4',
      timestamp: '2025-12-08T11:15:00',
      user: 'unknown@attacker.com',
      action: 'LOGIN',
      status: 'failed',
      details: 'Credenciales inválidas',
    },
    {
      id: '5',
      timestamp: '2025-12-08T11:20:00',
      user: 'admin@verihome.com',
      action: 'CONTRACT_REJECTED',
      status: 'success',
      details: 'Contrato #456 rechazado',
    },
  ];

  if (!adminPermissions.canViewAuditLogs) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          No tienes permisos para acceder a los logs del sistema.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Logs del Sistema
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Historial de actividades y eventos del sistema.
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems='center'
        >
          <TextField
            size='small'
            placeholder='Buscar por usuario o detalle...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            label='Desde'
            type='date'
            size='small'
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label='Hasta'
            type='date'
            size='small'
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size='small' sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filterType}
              label='Tipo'
              onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value='all'>Todos</MenuItem>
              <MenuItem value='login'>Login</MenuItem>
              <MenuItem value='contract'>Contratos</MenuItem>
              <MenuItem value='security'>Seguridad</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button
            variant='outlined'
            startIcon={
              exportMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={() => exportMutation.mutate('csv')}
            disabled={exportMutation.isPending}
          >
            Exportar CSV
          </Button>
        </Stack>
      </Paper>

      {/* Tabla de logs */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha/Hora</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Detalles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockLogs
                .filter(log => {
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (
                      log.user.toLowerCase().includes(term) ||
                      log.details.toLowerCase().includes(term)
                    );
                  }
                  return true;
                })
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant='body2'>
                        {new Date(log.timestamp).toLocaleString('es-CO')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{log.user}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={log.action}
                        variant='outlined'
                        color={
                          log.action.includes('APPROVED')
                            ? 'success'
                            : log.action.includes('REJECTED')
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={log.status}
                        color={log.status === 'success' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {log.details}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component='div'
          count={mockLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage='Filas por página'
        />
      </Paper>

      {/* Export error */}
      {exportMutation.isError && (
        <Alert severity='error' sx={{ mt: 2 }}>
          Error al exportar: {(exportMutation.error as Error).message}
        </Alert>
      )}
    </Box>
  );
};

export default AdminLogsViewer;
