import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Badge,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Description as TemplateIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { MessageList } from '../../components/messages/MessageList';
import Templates from './Templates';
import Folders from './Folders';
import MessagingStats from './MessagingStats';
import Conversations from './Conversations';
// import Compose from './Compose';
// import MessageDetail from './MessageDetail';
// import Templates from './Templates';
// import Folders from './Folders';
// import MessagingStats from './MessagingStats';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messages-tabpanel-${index}`}
      aria-labelledby={`messages-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MessagesMain: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    messages, 
    threads, 
    folders, 
    templates, 
    conversations, 
    unreadCount, 
    messagingStats,
    isLoading,
    error
  } = useMessages();

  // Asegurar que los datos sean arrays
  const messagesArray = Array.isArray(messages) ? messages : [];
  const threadsArray = Array.isArray(threads) ? threads : [];
  const foldersArray = Array.isArray(folders) ? folders : [];
  const templatesArray = Array.isArray(templates) ? templates : [];
  const conversationsArray = Array.isArray(conversations) ? conversations : [];

  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
    setDrawerOpen(false);
  };

  const getFilteredMessages = () => {
    if (!messagesArray.length) return [];
    
    if (selectedFolder) {
      return messagesArray.filter((msg: any) => msg.folder_id === selectedFolder);
    }
    
    return messagesArray;
  };

  const getUnreadCountForFolder = (folderId: string | null) => {
    if (!messagesArray.length) return 0;
    
    if (folderId) {
      return messagesArray.filter((msg: any) => 
        msg.folder_id === folderId && !msg.read
      ).length;
    }
    
    return unreadCount || 0;
  };

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && !authLoading) {

return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Necesitas iniciar sesión para ver los mensajes
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
        >
          Iniciar Sesión
        </Button>
      </Container>
    );
  }

  // Si está cargando la autenticación
  if (authLoading) {

return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
        </Box>
      </Container>
    );
  }

  if (isLoading) {

return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando mensajes...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    console.error('❌ MessagesMain: Error al cargar mensajes:', error);
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar los mensajes
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Detalles del error: {error.message || 'Error desconocido'}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </Container>
    );
  }

return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ height: 'calc(100vh - 200px)' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Sidebar */}
          <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Mensajes</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => navigate('/app/messages/new')}
                >
                  Nuevo
                </Button>
              </Box>
            </Box>

            <List sx={{ p: 0 }}>
              <ListItem 
                button 
                selected={!selectedFolder}
                onClick={() => handleFolderSelect(null)}
              >
                <ListItemIcon>
                  <Badge badgeContent={getUnreadCountForFolder(null)} color="error">
                    <InboxIcon />
                  </Badge>
                </ListItemIcon>
                <ListItemText 
                  primary="Bandeja de entrada" 
                  secondary={`${getUnreadCountForFolder(null)} no leídos`}
                />
              </ListItem>

              <ListItem button>
                <ListItemIcon>
                  <SendIcon />
                </ListItemIcon>
                <ListItemText primary="Enviados" />
              </ListItem>

              <ListItem button>
                <ListItemIcon>
                  <StarIcon />
                </ListItemIcon>
                <ListItemText primary="Destacados" />
              </ListItem>

              <ListItem button>
                <ListItemIcon>
                  <ArchiveIcon />
                </ListItemIcon>
                <ListItemText primary="Archivados" />
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemText 
                  primary="Carpetas" 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                />
              </ListItem>

              {foldersArray.map((folder: any) => (
                <ListItem 
                  key={folder.id}
                  button 
                  selected={selectedFolder === folder.id}
                  onClick={() => handleFolderSelect(folder.id)}
                >
                  <ListItemIcon>
                    <Badge badgeContent={getUnreadCountForFolder(folder.id)} color="error">
                      <FolderIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText 
                    primary={folder.name}
                    secondary={`${getUnreadCountForFolder(folder.id)} no leídos`}
                  />
                </ListItem>
              ))}

              <Divider />

              <ListItem button onClick={() => setTabValue(3)}>
                <ListItemIcon>
                  <TemplateIcon />
                </ListItemIcon>
                <ListItemText primary="Plantillas" />
              </ListItem>

              <ListItem button onClick={() => setTabValue(4)}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Configuración" />
              </ListItem>
            </List>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Mensajes" />
                <Tab label="Conversaciones" />
                <Tab label="Carpetas" />
                <Tab label="Plantillas" />
                <Tab label="Estadísticas" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <TabPanel value={tabValue} index={0}>
                <MessageList />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Conversations />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <Folders />
              </TabPanel>
              
              <TabPanel value={tabValue} index={3}>
                <Templates />
              </TabPanel>
              
              <TabPanel value={tabValue} index={4}>
                <MessagingStats />
              </TabPanel>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default MessagesMain; 