import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridActionsCellItem,
  GridToolbar,
  GridFilterModel,
  GridSortModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { usePayments } from '../../hooks/usePayments';
import { formatCurrency } from '../../utils/formatters';

export const PaymentTable: React.FC = () => {
  const navigate = useNavigate();
  const { payments, isLoading, error, deletePayment } = usePayments();
  
  // Estados para filtros y paginación
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
    quickFilterValues: [],
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  // Estados para filtros personalizados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtrar pagos basado en filtros personalizados
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return payments.filter((payment) => {
      // Filtro de búsqueda
      const matchesSearch = searchTerm === '' || 
        payment.contract.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.contract.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, statusFilter]);

  // Definir columnas de la tabla
  const columns: GridColDef[] = [
    {
      field: 'contract',
      headerName: 'Contrato',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value.property.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.property.address}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'tenant',
      headerName: 'Inquilino',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.contract.tenant.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.contract.tenant.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'Monto',
      type: 'number',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: 'Fecha Vencimiento',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      field: 'payment_date',
      headerName: 'Fecha Pago',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.value ? new Date(params.value).toLocaleDateString() : 'Pendiente'}
        </Typography>
      ),
    },
    {
      field: 'payment_method',
      headerName: 'Método',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value || 'No especificado'}
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'paid' ? 'Pagado' : 
                 params.value === 'pending' ? 'Pendiente' : 
                 params.value === 'overdue' ? 'Vencido' : 'Cancelado'}
          color={params.value === 'paid' ? 'success' : 
                 params.value === 'pending' ? 'warning' : 
                 params.value === 'overdue' ? 'error' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<ViewIcon />}
          label="Ver"
          onClick={() => navigate(`/app/payments/${params.row.id}`)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Editar"
          onClick={() => navigate(`/app/payments/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Eliminar"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  const handleDelete = async (paymentId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este pago?')) {
      await deletePayment.mutateAsync(paymentId.toString());
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFilterModel({ items: [], quickFilterValues: [] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography>Cargando pagos...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Error al cargar los pagos</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Lista de Pagos</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/payments/new')}
          >
            Nuevo Pago
          </Button>
        </Box>

        {/* Filtros personalizados */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField
            label="Buscar"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="overdue">Vencido</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={clearFilters}
          >
            Limpiar Filtros
          </Button>
        </Box>

        {/* DataGrid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredPayments}
            columns={columns}
            filterModel={filterModel}
            onFilterModelChange={setFilterModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50]}
            pagination
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}; 