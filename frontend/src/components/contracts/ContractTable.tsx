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
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { formatCurrency } from '../../utils/formatters';

export const ContractTable: React.FC = () => {
  const navigate = useNavigate();
  const { contracts, isLoading, error, deleteContract } = useContracts();
  
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

  // Filtrar contratos basado en filtros personalizados
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];

    return contracts.filter((contract) => {
      // Filtro de búsqueda
      const matchesSearch = searchTerm === '' || 
        contract.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  // Definir columnas de la tabla
  const columns: GridColDef[] = [
    {
      field: 'property',
      headerName: 'Propiedad',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.address}
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
            {params.value.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'monthly_rent',
      headerName: 'Renta Mensual',
      type: 'number',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'start_date',
      headerName: 'Fecha Inicio',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      field: 'end_date',
      headerName: 'Fecha Fin',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'active' ? 'Activo' : 
                 params.value === 'expired' ? 'Expirado' : 
                 params.value === 'terminated' ? 'Terminado' : 'Pendiente'}
          color={params.value === 'active' ? 'success' : 
                 params.value === 'expired' ? 'warning' : 
                 params.value === 'terminated' ? 'error' : 'default'}
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
          onClick={() => navigate(`/contracts/${params.row.id}`)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Editar"
          onClick={() => navigate(`/contracts/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Eliminar"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  const handleDelete = async (contractId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contrato?')) {
      await deleteContract.mutateAsync(contractId.toString());
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
          <Typography>Cargando contratos...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Error al cargar los contratos</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Lista de Contratos</Typography>
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
              <MenuItem value="active">Activo</MenuItem>
              <MenuItem value="expired">Expirado</MenuItem>
              <MenuItem value="terminated">Terminado</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
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
            rows={filteredContracts}
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