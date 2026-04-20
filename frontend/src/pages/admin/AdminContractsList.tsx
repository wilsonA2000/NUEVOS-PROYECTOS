/**
 * 📋 ADMIN CONTRACTS LIST (Plan Maestro V2.0)
 *
 * Lista de contratos pendientes de revisión administrativa.
 * Solo accesible por is_staff=True o is_superuser=True.
 *
 * Features:
 * - Tabla con filtros (días pendientes, arrendador, propiedad)
 * - Indicador visual de urgencia (> 3 días = amarillo, > 7 días = rojo)
 * - Acciones rápidas en línea
 * - Soporte para ciclo de corrección (RE_PENDING_ADMIN)
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Loop as CycleIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import {
  AdminService,
  AdminContractSummary,
} from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ============================================================================
// TYPES
// ============================================================================

type Order = 'asc' | 'desc';
type OrderBy = keyof AdminContractSummary;

interface HeadCell {
  id: OrderBy;
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const headCells: HeadCell[] = [
  { id: 'property_title', label: 'Propiedad', numeric: false, sortable: true },
  { id: 'landlord_name', label: 'Arrendador', numeric: false, sortable: true },
  { id: 'tenant_name', label: 'Arrendatario', numeric: false, sortable: true },
  { id: 'current_state', label: 'Estado', numeric: false, sortable: true },
  {
    id: 'days_pending',
    label: 'Días Pendiente',
    numeric: true,
    sortable: true,
  },
  { id: 'review_cycle_count', label: 'Ciclo', numeric: true, sortable: true },
  { id: 'monthly_rent', label: 'Canon', numeric: true, sortable: true },
  { id: 'created_at', label: 'Creado', numeric: false, sortable: true },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtener color de urgencia basado en días pendientes
 */
const getUrgencyColor = (days: number): 'default' | 'warning' | 'error' => {
  if (days >= 7) return 'error';
  if (days >= 3) return 'warning';
  return 'default';
};

/**
 * Obtener icono de urgencia
 */
const getUrgencyIcon = (days: number) => {
  if (days >= 7) return <ErrorIcon fontSize='small' />;
  if (days >= 3) return <WarningIcon fontSize='small' />;
  return <ScheduleIcon fontSize='small' />;
};

/**
 * Formatear estado para display
 */
const formatState = (state: string): string => {
  const stateMap: Record<string, string> = {
    PENDING_ADMIN_REVIEW: 'Pendiente Revisión',
    RE_PENDING_ADMIN: 'Re-Revisión',
    TENANT_RETURNED: 'Devuelto por Inquilino',
    LANDLORD_CORRECTING: 'En Corrección',
    DRAFT: 'Borrador',
  };
  return stateMap[state] || state;
};

/**
 * Formatear fecha
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formatear moneda
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Comparador para ordenamiento
 */
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator<Key extends keyof AdminContractSummary>(
  order: Order,
  orderBy: Key,
): (a: AdminContractSummary, b: AdminContractSummary) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminContractsList: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading, adminPermissions } = useAdminAuth();

  // State
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('days_pending');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

  // Fetch contracts
  const {
    data: contracts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-pending-contracts'],
    queryFn: AdminService.getPendingContracts,
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-contract-stats'],
    queryFn: AdminService.getContractStats,
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  // Filtered and sorted contracts
  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        c =>
          (c.property_title ?? '').toLowerCase().includes(term) ||
          c.landlord_name.toLowerCase().includes(term) ||
          (c.tenant_name ?? '').toLowerCase().includes(term) ||
          c.property_address.toLowerCase().includes(term),
      );
    }

    // Apply state filter
    if (stateFilter !== 'all') {
      filtered = filtered.filter(c => c.current_state === stateFilter);
    }

    // Sort
    return filtered.sort(getComparator(order, orderBy));
  }, [contracts, searchTerm, stateFilter, order, orderBy]);

  // Handlers
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewContract = (contractId: string) => {
    navigate(`/app/admin/contracts/${contractId}`);
  };

  const handleStateFilterChange = (event: SelectChangeEvent) => {
    setStateFilter(event.target.value);
    setPage(0);
  };

  // Loading state
  if (authLoading) {
    return <LoadingSpinner message='Verificando permisos...' />;
  }

  // Access denied
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          Acceso denegado. Se requieren permisos de administrador.
        </Alert>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='error'
          action={<Button onClick={() => refetch()}>Reintentar</Button>}
        >
          Error al cargar contratos: {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  // Paginated data
  const paginatedContracts = filteredContracts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Box>
          <Typography variant='h4' fontWeight='bold'>
            Contratos Pendientes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {stats?.pending_review || 0} contratos requieren revisión
          </Typography>
        </Box>
        <Button
          variant='outlined'
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Actualizar
        </Button>
      </Stack>

      {/* Stats Cards */}
      {stats && (
        <Stack direction='row' spacing={2} mb={3} flexWrap='wrap' useFlexGap>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant='body2' color='text.secondary'>
              Pendientes
            </Typography>
            <Typography variant='h4' color='primary.main'>
              {stats.pending_review}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant='body2' color='text.secondary'>
              Urgentes (&gt;7 días)
            </Typography>
            <Typography variant='h4' color='error.main'>
              {stats.urgent_contracts}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant='body2' color='text.secondary'>
              Aprobados Hoy
            </Typography>
            <Typography variant='h4' color='success.main'>
              {stats.approved_today}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant='body2' color='text.secondary'>
              Rechazados Hoy
            </Typography>
            <Typography variant='h4' color='warning.main'>
              {stats.rejected_today}
            </Typography>
          </Paper>
        </Stack>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems='center'
        >
          <TextField
            size='small'
            placeholder='Buscar por propiedad, arrendador, inquilino...'
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size='small' sx={{ minWidth: 200 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={stateFilter}
              label='Estado'
              onChange={handleStateFilterChange}
              startAdornment={
                <FilterIcon sx={{ mr: 1, color: 'action.active' }} />
              }
            >
              <MenuItem value='all'>Todos los estados</MenuItem>
              <MenuItem value='PENDING_ADMIN_REVIEW'>
                Pendiente Revisión
              </MenuItem>
              <MenuItem value='RE_PENDING_ADMIN'>Re-Revisión (Ciclo)</MenuItem>
            </Select>
          </FormControl>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ ml: 'auto' }}
          >
            {filteredContracts.length} contratos encontrados
          </Typography>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : filteredContracts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'success.light',
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant='h6' gutterBottom>
              No hay contratos pendientes
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Todos los contratos han sido revisados
            </Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  {headCells.map(headCell => (
                    <TableCell
                      key={headCell.id}
                      align={headCell.numeric ? 'right' : 'left'}
                      sortDirection={orderBy === headCell.id ? order : false}
                    >
                      {headCell.sortable ? (
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : 'asc'}
                          onClick={() => handleRequestSort(headCell.id)}
                        >
                          {headCell.label}
                        </TableSortLabel>
                      ) : (
                        headCell.label
                      )}
                    </TableCell>
                  ))}
                  <TableCell align='center'>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedContracts.map(contract => (
                  <TableRow
                    key={contract.id}
                    hover
                    sx={{
                      bgcolor: contract.is_urgent ? 'error.50' : 'inherit',
                      '&:hover': {
                        bgcolor: contract.is_urgent ? 'error.100' : undefined,
                      },
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant='body2' fontWeight='medium'>
                          {contract.property_title}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {contract.property_address}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2'>
                          {contract.landlord_name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {contract.landlord_email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2'>
                          {contract.tenant_name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {contract.tenant_email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={formatState(contract.current_state ?? '')}
                        color={
                          contract.current_state === 'RE_PENDING_ADMIN'
                            ? 'secondary'
                            : 'primary'
                        }
                        icon={
                          contract.current_state === 'RE_PENDING_ADMIN' ? (
                            <CycleIcon />
                          ) : undefined
                        }
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Chip
                        size='small'
                        icon={getUrgencyIcon(contract.days_pending)}
                        label={`${contract.days_pending} días`}
                        color={getUrgencyColor(contract.days_pending)}
                        variant={
                          contract.days_pending >= 7 ? 'filled' : 'outlined'
                        }
                      />
                    </TableCell>
                    <TableCell align='right'>
                      {(contract.review_cycle_count ?? 0) > 1 ? (
                        <Tooltip
                          title={`Ciclo de revisión #${contract.review_cycle_count}`}
                        >
                          <Chip
                            size='small'
                            icon={<CycleIcon />}
                            label={`#${contract.review_cycle_count}`}
                            color='info'
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          1
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>
                        {formatCurrency(contract.monthly_rent)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {formatDate(contract.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        justifyContent='center'
                      >
                        <Tooltip title='Ver detalle'>
                          <IconButton
                            size='small'
                            color='primary'
                            onClick={() => handleViewContract(contract.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {adminPermissions.canApproveContracts && (
                          <Tooltip title='Aprobar'>
                            <IconButton
                              size='small'
                              color='success'
                              onClick={() =>
                                navigate(
                                  `/app/admin/contracts/${contract.id}?action=approve`,
                                )
                              }
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {adminPermissions.canRejectContracts && (
                          <Tooltip title='Rechazar'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() =>
                                navigate(
                                  `/app/admin/contracts/${contract.id}?action=reject`,
                                )
                              }
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component='div'
              count={filteredContracts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage='Filas por página'
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
};

export default AdminContractsList;
