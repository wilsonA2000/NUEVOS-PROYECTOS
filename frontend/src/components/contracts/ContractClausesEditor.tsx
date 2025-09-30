/**
 * Editor de Cláusulas Adicionales para Contratos
 * Permite al arrendador agregar, editar y eliminar cláusulas personalizadas
 * Con previsualización en tiempo real del contrato
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Assignment as ClauseIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { viewContractPDF } from '../../utils/contractPdfUtils';

interface Clause {
  id: string;
  title: string;
  content: string;
  clause_number: number;
  ordinal_text: string;
  order: number;
  created_at: string;
  updated_at: string;
}

interface ContractClausesEditorProps {
  contractId: string;
  onClausesChange?: () => void;
}

const ContractClausesEditor: React.FC<ContractClausesEditorProps> = ({
  contractId,
  onClausesChange
}) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | null>(null);
  const [nextClauseNumber, setNextClauseNumber] = useState(11);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const [errors, setErrors] = useState<{title?: string, content?: string}>({});

  useEffect(() => {
    loadClauses();
  }, [contractId]);

  const loadClauses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/contracts/${contractId}/additional-clauses/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClauses(data.clauses || []);
        setNextClauseNumber(data.next_clause_number || 11);
      } else {
        console.error('Error loading clauses:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading clauses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClause = () => {
    setEditingClause(null);
    setFormData({ title: '', content: '' });
    setErrors({});
    setDialogOpen(true);
  };

  const handleEditClause = (clause: Clause) => {
    setEditingClause(clause);
    setFormData({
      title: clause.title,
      content: clause.content
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteClause = async (clause: Clause) => {
    if (!window.confirm(`¿Estás seguro de eliminar la cláusula "${clause.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/contracts/${contractId}/additional-clauses/${clause.id}/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          }
        }
      );

      if (response.ok) {
        await loadClauses();
        onClausesChange?.();
      } else {
        alert('Error al eliminar la cláusula');
      }
    } catch (error) {
      console.error('Error deleting clause:', error);
      alert('Error al eliminar la cláusula');
    }
  };

  const handleSaveClause = async () => {
    // Validación
    const newErrors: {title?: string, content?: string} = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'El contenido es requerido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const method = editingClause ? 'PUT' : 'POST';
      const url = editingClause 
        ? `/api/v1/contracts/${contractId}/additional-clauses/${editingClause.id}/`
        : `/api/v1/contracts/${contractId}/additional-clauses/`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setDialogOpen(false);
        await loadClauses();
        onClausesChange?.();
        setFormData({ title: '', content: '' });
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al guardar la cláusula');
      }
    } catch (error) {
      console.error('Error saving clause:', error);
      alert('Error al guardar la cláusula');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewContract = () => {
    // Abrir vista previa del contrato con cláusulas usando autenticación JWT
    viewContractPDF(contractId);
  };

  const getOrdinalText = (number: number) => {
    const ordinales = [
      '', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 
      'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
      'UNDÉCIMA', 'DUODÉCIMA', 'DECIMOTERCERA', 'DECIMOCUARTA', 'DECIMOQUINTA',
      'DECIMOSEXTA', 'DECIMOSÉPTIMA', 'DECIMOCTAVA', 'DECIMONOVENA', 'VIGÉSIMA'
    ];
    
    return number <= ordinales.length ? ordinales[number] : `CLÁUSULA ${number}`;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h3">
          📋 Cláusulas Adicionales
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClause}
            size="small"
          >
            Agregar Cláusula
          </Button>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handlePreviewContract}
            size="small"
            color="secondary"
          >
            Vista Previa PDF
          </Button>
        </Stack>
      </Box>

      {/* Info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Cláusulas base del contrato:</strong> PRIMERA a DÉCIMA (10 cláusulas)<br/>
          <strong>Próxima cláusula adicional:</strong> {getOrdinalText(nextClauseNumber)} (#{nextClauseNumber})
        </Typography>
      </Alert>

      {/* Lista de cláusulas */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {clauses.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <ClauseIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No hay cláusulas adicionales
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  El contrato tiene las 10 cláusulas estándar.
                  Puedes agregar cláusulas personalizadas usando el botón "Agregar Cláusula".
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List>
              {clauses.map((clause, index) => (
                <React.Fragment key={clause.id}>
                  <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={clause.ordinal_text} 
                            color="primary" 
                            size="small" 
                          />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {clause.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                            {clause.content.length > 200 
                              ? `${clause.content.substring(0, 200)}...` 
                              : clause.content
                            }
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Creada: {new Date(clause.created_at).toLocaleDateString('es-CO')}
                            {clause.updated_at !== clause.created_at && (
                              ` • Actualizada: ${new Date(clause.updated_at).toLocaleDateString('es-CO')}`
                            )}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleEditClause(clause)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteClause(clause)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < clauses.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}

      {/* Dialog para agregar/editar cláusula */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingClause ? (
            <>✏️ Editar Cláusula: {editingClause.ordinal_text}</>
          ) : (
            <>➕ Agregar Nueva Cláusula: {getOrdinalText(nextClauseNumber)}</>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <FormLabel>Título de la Cláusula</FormLabel>
              <TextField
                placeholder="Ej: MASCOTAS, SERVICIOS ADICIONALES, RESTRICCIONES"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                error={!!errors.title}
                helperText={errors.title || 'Escribe un título descriptivo para la cláusula'}
                fullWidth
                size="medium"
                sx={{ mt: 1 }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Contenido de la Cláusula</FormLabel>
              <TextField
                multiline
                rows={6}
                placeholder="Escribe el contenido completo de la cláusula. Ej: El ARRENDATARIO podrá tener mascotas en el inmueble, previo consentimiento escrito del ARRENDADOR y el pago de un depósito adicional equivalente a medio mes de arrendamiento."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                error={!!errors.content}
                helperText={errors.content || 'Escribe el texto completo tal como aparecerá en el contrato'}
                fullWidth
                sx={{ mt: 1 }}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveClause}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Guardando...' : (editingClause ? 'Actualizar' : 'Agregar Cláusula')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractClausesEditor;