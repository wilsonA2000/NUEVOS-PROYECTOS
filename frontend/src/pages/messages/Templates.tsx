import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { ensureArray } from '../../utils/arrayUtils';

const Templates: React.FC = () => {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useMessages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    category: '',
  });

  const templatesArray = ensureArray(templates);

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        content: template.content || '',
        category: template.category || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        subject: '',
        content: '',
        category: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      content: '',
      category: '',
    });
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplate(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      deleteTemplate(templateId);
    }
  };

  const handleCopy = (template: any) => {
    navigator.clipboard.writeText(template.content);
    // Aquí podrías mostrar una notificación de éxito
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Plantillas de Mensajes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Plantilla
        </Button>
      </Box>

      {templatesArray.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TemplateIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay plantillas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea tu primera plantilla para ahorrar tiempo al escribir mensajes frecuentes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Crear Primera Plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {templatesArray.map((template: any) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {template.name}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(template)}
                        title="Copiar contenido"
                      >
                        <CopyIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(template)}
                        title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(template.id)}
                        title="Eliminar"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {template.category && (
                    <Chip
                      label={template.category}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Asunto: {template.subject}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      mb: 2,
                    }}
                  >
                    {template.content}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Creada: {template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Fecha desconocida'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para crear/editar plantilla */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nombre de la plantilla"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Asunto"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contenido"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              multiline
              rows={6}
              placeholder="Escribe el contenido de tu plantilla aquí..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTemplate ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Templates; 