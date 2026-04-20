/**
 * ADM-001 · AdminAuditLog
 *
 * Visor del audit trail global. Alimentado por `/api/v1/core/audit-logs/`
 * (Fase 1.9.7). Solo accesible para staff.
 *
 * Filtros soportados:
 *   - rango de fechas (date_from / date_to, ISO 8601)
 *   - tipo de actividad (activity_type)
 *   - modelo afectado (model_name)
 *   - usuario por UUID
 *
 * Sin mocks: si el backend retorna 0 registros, se muestra estado vacío.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminService, AuditLogFilters } from '../../services/adminService';

const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'property.create', label: 'Propiedad creada' },
  { value: 'contract.biometric_start', label: 'Biométrica iniciada' },
  { value: 'match.accept', label: 'Match aceptado' },
  { value: 'rating.create', label: 'Rating creado' },
  { value: 'service_order.accept', label: 'Servicio aceptado' },
  { value: 'payment.process', label: 'Pago procesado' },
  { value: 'verification.visit_complete', label: 'Visita completada' },
];

const AdminAuditLog: React.FC = () => {
  const { adminPermissions } = useAdminAuth();

  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0] ?? '';
  });
  const [dateTo, setDateTo] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [activityType, setActivityType] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(25);

  const filters = useMemo<AuditLogFilters>(
    () => ({
      date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
      activity_type: activityType || undefined,
      model_name: modelName || undefined,
      page: page + 1,
      page_size: pageSize,
    }),
    [dateFrom, dateTo, activityType, modelName, page, pageSize],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: () => AdminService.getAuditLogs(filters),
    placeholderData: keepPreviousData,
    enabled: !!adminPermissions.canViewAuditLogs,
  });

  if (!adminPermissions.canViewAuditLogs) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          No tienes permisos para acceder al audit trail global.
        </Alert>
      </Box>
    );
  }

  const rows = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h4" fontWeight="bold">
          Audit Trail Global
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Registro relacional de cada acción auditada por{' '}
        <code>core.audit_service.log_activity</code> (Fase 1.9.7). Cada acción
        de negocio (creación, cambio de estado, pago, autenticación biométrica)
        queda aquí con IP, user-agent y metadatos.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Desde"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => {
              setPage(0);
              setDateFrom(e.target.value);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => {
              setPage(0);
              setDateTo(e.target.value);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Tipo de actividad</InputLabel>
            <Select
              value={activityType}
              label="Tipo de actividad"
              onChange={(e) => {
                setPage(0);
                setActivityType(e.target.value);
              }}
            >
              {ACTIVITY_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Modelo afectado"
            size="small"
            value={modelName}
            onChange={(e) => {
              setPage(0);
              setModelName(e.target.value);
            }}
            placeholder="contract / property / rating…"
          />
        </Stack>
      </Paper>

      <Paper>
        {isLoading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            No fue posible cargar el audit trail: {(error as Error)?.message}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Modelo</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 4 }}
                        >
                          Sin registros para los filtros seleccionados.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Tooltip title={log.timestamp} arrow>
                            <Typography variant="body2">
                              {log.formatted_timestamp ??
                                new Date(log.timestamp).toLocaleString('es-CO')}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.user_name || log.user}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.activity_type_display ?? log.activity_type}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{log.description}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {log.model_name
                              ? `${log.model_name}${
                                  log.object_id ? `:${log.object_id.slice(0, 8)}` : ''
                                }`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {log.ip_address ?? '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Por página"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count}`
              }
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AdminAuditLog;
