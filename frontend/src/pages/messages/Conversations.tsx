import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Person as PersonIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { ensureArray } from '../../utils/arrayUtils';

const Conversations: React.FC = () => {
  const { 
    conversations, 
    threads, 
    messages, 
    createConversation, 
    updateConversation, 
    deleteConversation,
    archiveConversation,
    markConversationRead
  } = useMessages();
  
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConversation, setEditingConversation] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    participants: '',
    description: '',
  });

  const conversationsArray = ensureArray(conversations);
  const threadsArray = ensureArray(threads);
  const messagesArray = ensureArray(messages);

  const handleOpenDialog = (conversation?: any) => {
    if (conversation) {
      setEditingConversation(conversation);
      setFormData({
        title: conversation.title || '',
        participants: conversation.participants?.join(', ') || '',
        description: conversation.description || '',
      });
    } else {
      setEditingConversation(null);
      setFormData({
        title: '',
        participants: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConversation(null);
    setFormData({
      title: '',
      participants: '',
      description: '',
    });
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      participants: formData.participants.split(',').map(p => p.trim()).filter(p => p),
    };
    
    if (editingConversation) {
      updateConversation({ id: editingConversation.id, data });
    } else {
      createConversation(data);
    }
    handleCloseDialog();
  };

  const handleDelete = (conversationId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta conversación?')) {
      deleteConversation(conversationId);
    }
  };

  const handleArchive = (conversationId: string, archived: boolean) => {
    archiveConversation(conversationId);
  };

  const handleMarkRead = (conversationId: string) => {
    markConversationRead(conversationId);
  };

  const getMessageCount = (conversationId: string) => {
    return messagesArray.filter((msg: any) => msg.conversation_id === conversationId).length;
  };

  const getUnreadCount = (conversationId: string) => {
    return messagesArray.filter((msg: any) => 
      msg.conversation_id === conversationId && !msg.read
    ).length;
  };

  const getLastMessage = (conversationId: string) => {
    const conversationMessages = messagesArray
      .filter((msg: any) => msg.conversation_id === conversationId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return conversationMessages[0];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Conversaciones
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Conversación
        </Button>
      </Box>

      {conversationsArray.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay conversaciones
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea tu primera conversación para comenzar a comunicarte
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Crear Primera Conversación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {conversationsArray.map((conversation: any) => {
            const lastMessage = getLastMessage(conversation.id);
            const unreadCount = getUnreadCount(conversation.id);
            const messageCount = getMessageCount(conversation.id);
            
            return (
              <Grid item xs={12} key={conversation.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 },
                    border: unreadCount > 0 ? '2px solid #1976d2' : 'none'
                  }}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Badge badgeContent={unreadCount} color="error">
                          <Avatar sx={{ mr: 2 }}>
                            <PersonIcon />
                          </Avatar>
                        </Badge>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" component="div">
                            {conversation.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {conversation.participants?.join(', ') || 'Sin participantes'}
                          </Typography>
                          {lastMessage && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                mt: 1,
                                fontStyle: unreadCount > 0 ? 'normal' : 'italic',
                                fontWeight: unreadCount > 0 ? 'bold' : 'normal'
                              }}
                            >
                              {lastMessage.content?.substring(0, 100)}...
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            icon={<MessageIcon />}
                            label={messageCount}
                            size="small"
                            variant="outlined"
                          />
                          {unreadCount > 0 && (
                            <Chip
                              label={unreadCount}
                              size="small"
                              color="error"
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(conversation.id);
                            }}
                            title="Marcar como leído"
                          >
                            <ScheduleIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(conversation.id, conversation.archived);
                            }}
                            title={conversation.archived ? "Desarchivar" : "Archivar"}
                          >
                            {conversation.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(conversation);
                            }}
                            title="Editar"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(conversation.id);
                            }}
                            title="Eliminar"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                    
                    {conversation.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mt: 2, fontStyle: 'italic' }}
                      >
                        {conversation.description}
                      </Typography>
                    )}
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Última actividad: {lastMessage?.created_at ? new Date(lastMessage.created_at).toLocaleDateString() : 'Nunca'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog para crear/editar conversación */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConversation ? 'Editar Conversación' : 'Nueva Conversación'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Título de la conversación"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Participantes (separados por comas)"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder="usuario1@email.com, usuario2@email.com"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingConversation ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Conversations; 