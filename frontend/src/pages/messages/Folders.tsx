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
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Email as EmailIcon,
  ColorLens as ColorIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { ensureArray } from '../../utils/arrayUtils';

const Folders: React.FC = () => {
  const { folders, createFolder, updateFolder, deleteFolder, messages } = useMessages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1976d2',
  });

  const foldersArray = ensureArray(folders);
  const messagesArray = ensureArray(messages);

  const handleOpenDialog = (folder?: any) => {
    if (folder) {
      setEditingFolder(folder);
      setFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || '#1976d2',
      });
    } else {
      setEditingFolder(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFolder(null);
    setFormData({
      name: '',
      description: '',
      color: '#1976d2',
    });
  };

  const handleSubmit = () => {
    if (editingFolder) {
      updateFolder({ id: editingFolder.id, data: formData });
    } else {
      createFolder(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = (folderId: string) => {
    const messageCount = messagesArray.filter((msg: any) => msg.folder_id === folderId).length;
    
    if (messageCount > 0) {
      alert(`No puedes eliminar esta carpeta porque contiene ${messageCount} mensajes. Mueve los mensajes a otra carpeta primero.`);
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar esta carpeta?')) {
      deleteFolder(folderId);
    }
  };

  const getMessageCount = (folderId: string) => {
    return messagesArray.filter((msg: any) => msg.folder_id === folderId).length;
  };

  const getUnreadCount = (folderId: string) => {
    return messagesArray.filter((msg: any) => 
      msg.folder_id === folderId && !msg.read
    ).length;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Carpetas de Mensajes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Carpeta
        </Button>
      </Box>

      {foldersArray.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay carpetas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea carpetas para organizar mejor tus mensajes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Crear Primera Carpeta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {foldersArray.map((folder: any) => (
            <Grid item xs={12} sm={6} md={4} key={folder.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: folder.color || '#1976d2',
                          mr: 1,
                        }}
                      />
                      <Typography variant="h6" component="div">
                        {folder.name}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(folder)}
                        title="Editar carpeta"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(folder.id)}
                        title="Eliminar carpeta"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {folder.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {folder.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      icon={<EmailIcon />}
                      label={`${getMessageCount(folder.id)} mensajes`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${getUnreadCount(folder.id)} no leídos`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Creada: {folder.created_at ? new Date(folder.created_at).toLocaleDateString() : 'Fecha desconocida'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para crear/editar carpeta */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nombre de la carpeta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">Color:</Typography>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: 50, height: 40, border: 'none', borderRadius: 4 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingFolder ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Folders; 