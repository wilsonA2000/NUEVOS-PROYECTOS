/**
 * 📋 ADMIN AUDIT DASHBOARD (Plan Maestro V2.0)
 *
 * Dashboard de auditoría para generación de reportes.
 * Permite generar reportes para autoridades y compliance.
 *
 * Features:
 * - Selector de rango de fechas
 * - Checkboxes de secciones a incluir
 * - Generación y descarga de reportes
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  DateRange as DateIcon,
  Description as ContractsIcon,
  People as UsersIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';

import { AdminService, AuditReportRequest } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Secciones disponibles para el reporte
 */
const REPORT_SECTIONS = [
  { id: 'contracts', label: 'Contratos', icon: <ContractsIcon />, description: 'Actividad de contratos, aprobaciones y rechazos' },
  { id: 'users', label: 'Usuarios', icon: <UsersIcon />, description: 'Registros, logins y actividad de usuarios' },
  { id: 'security', label: 'Seguridad', icon: <SecurityIcon />, description: 'Intentos fallidos, IPs bloqueadas, alertas' },
  { id: 'payments', label: 'Pagos', icon: <PaymentIcon />, description: 'Transacciones y movimientos financieros' },
];

/**
 * Dashboard de auditoría
 */
const AdminAuditDashboard: React.FC = () => {
  const { adminPermissions } = useAdminAuth();

  // Estado del formulario
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0] ?? '';
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [selectedSections, setSelectedSections] = useState<string[]>(['contracts']);
  const [format, setFormat] = useState<'json' | 'pdf' | 'csv'>('pdf');

  // Mutation para generar reporte
  const generateMutation = useMutation({
    mutationFn: (request: AuditReportRequest) => AdminService.generateAuditReport(request),
    onSuccess: (data) => {
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }
    },
  });

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = () => {
    generateMutation.mutate({
      date_from: dateFrom,
      date_to: dateTo,
      include_sections: selectedSections,
      format,
    });
  };

  if (!adminPermissions.canViewAuditLogs) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          No tienes permisos para acceder a los reportes de auditoría.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Reportes de Auditoría
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Genera reportes detallados para cumplimiento legal y auditorías externas.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Configuración del reporte */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <GavelIcon color="primary" />
              <Typography variant="h6" fontWeight="medium">
                Configurar Reporte
              </Typography>
            </Box>

            {/* Rango de fechas */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Rango de Fechas
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Secciones */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Secciones a Incluir
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {REPORT_SECTIONS.map((section) => (
                <Grid item xs={12} sm={6} key={section.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      borderColor: selectedSections.includes(section.id)
                        ? 'primary.main'
                        : 'divider',
                      bgcolor: selectedSections.includes(section.id)
                        ? 'primary.50'
                        : 'background.paper',
                    }}
                    onClick={() => handleSectionToggle(section.id)}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
                      <Checkbox
                        checked={selectedSections.includes(section.id)}
                        onChange={() => handleSectionToggle(section.id)}
                        sx={{ p: 0 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {section.icon}
                          <Typography variant="body1" fontWeight="medium">
                            {section.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {section.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Formato */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Formato de Exportación
            </Typography>
            <FormControl sx={{ minWidth: 200, mb: 3 }}>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'pdf' | 'csv')}
              >
                <MenuItem value="pdf">PDF (Documento)</MenuItem>
                <MenuItem value="csv">CSV (Excel)</MenuItem>
                <MenuItem value="json">JSON (Datos)</MenuItem>
              </Select>
            </FormControl>

            {/* Botón generar */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  generateMutation.isPending ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <DownloadIcon />
                  )
                }
                onClick={handleGenerate}
                disabled={generateMutation.isPending || selectedSections.length === 0}
              >
                {generateMutation.isPending ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </Box>

            {/* Error */}
            {generateMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Error al generar el reporte: {(generateMutation.error as Error).message}
              </Alert>
            )}

            {/* Success */}
            {generateMutation.isSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Reporte generado exitosamente. ID: {generateMutation.data.report_id}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Panel informativo */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ReportIcon color="primary" />
              <Typography variant="h6" fontWeight="medium">
                Información
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Los reportes de auditoría incluyen información detallada sobre las
              operaciones del sistema, cumpliendo con los requisitos de la Ley 1581
              de 2012 de Protección de Datos Personales.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              <strong>Nota:</strong> Los reportes pueden tardar varios minutos en
              generarse dependiendo del rango de fechas seleccionado.
            </Typography>
          </Paper>

          <Alert severity="info">
            <Typography variant="body2">
              Los reportes generados se almacenan por 30 días y pueden ser
              descargados múltiples veces durante ese período.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminAuditDashboard;
