import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { ensureArray } from '../../utils/arrayUtils';

const MessagingStats: React.FC = () => {
  const { 
    messages, 
    threads, 
    conversations, 
    messagingStats, 
    unreadCount 
  } = useMessages();

  const messagesArray = ensureArray(messages);
  const threadsArray = ensureArray(threads);
  const conversationsArray = ensureArray(conversations);

  // Calcular estadísticas básicas
  const totalMessages = messagesArray.length;
  const unreadMessages = unreadCount || 0;
  const readMessages = totalMessages - unreadMessages;
  const starredMessages = messagesArray.filter((msg: any) => msg.starred).length;
  const sentMessages = messagesArray.filter((msg: any) => msg.sender_id === 'current_user').length;

  // Calcular porcentajes
  const readPercentage = totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;
  const unreadPercentage = totalMessages > 0 ? (unreadMessages / totalMessages) * 100 : 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Estadísticas de Mensajería
      </Typography>

      <Grid container spacing={3}>
        {/* Tarjetas de resumen */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {totalMessages}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Mensajes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InboxIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" color="error.main">
                    {unreadMessages}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No Leídos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SendIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" color="success.main">
                    {sentMessages}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enviados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" color="warning.main">
                    {starredMessages}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Destacados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Progreso de lectura */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado de Lectura
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Leídos</Typography>
                  <Typography variant="body2">{readMessages} ({readPercentage.toFixed(1)}%)</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={readPercentage} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">No leídos</Typography>
                  <Typography variant="body2">{unreadMessages} ({unreadPercentage.toFixed(1)}%)</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={unreadPercentage} 
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Estadísticas de conversaciones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversaciones
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  icon={<PersonIcon />}
                  label={`${threadsArray.length} Hilos`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<ArchiveIcon />}
                  label={`${conversationsArray.length} Conversaciones`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Promedio de mensajes por conversación: {
                  conversationsArray.length > 0 
                    ? (totalMessages / conversationsArray.length).toFixed(1)
                    : '0'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Actividad reciente */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actividad Reciente
              </Typography>
              <List>
                {messagesArray.slice(0, 5).map((message: any, index: number) => (
                  <React.Fragment key={message.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon color={message.read ? "disabled" : "primary"} />
                      </ListItemIcon>
                      <ListItemText
                        primary={message.subject || 'Sin asunto'}
                        secondary={`${message.sender_name || 'Remitente desconocido'} • ${message.created_at ? new Date(message.created_at).toLocaleDateString() : 'Fecha desconocida'}`}
                      />
                      {!message.read && (
                        <Chip label="Nuevo" size="small" color="error" />
                      )}
                    </ListItem>
                    {index < 4 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagingStats; 