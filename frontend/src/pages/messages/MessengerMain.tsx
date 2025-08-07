/**
 * MessengerMain - Sistema completo de mensajería con solicitudes y chat en tiempo real
 * Incluye: Solicitudes pendientes, Conversaciones activas, Chat en tiempo real
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  Alert,
  Container,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Build as BuildIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useOptimizedWebSocketContext } from '../../contexts/OptimizedWebSocketContext';
import { useAuth } from '../../hooks/useAuth';
import { useMessages } from '../../hooks/useMessages';
import { useUserStatus } from '../../hooks/useUserStatus';
import { OnlineUsersCounter } from '../../components/users/UserStatusIndicator';
import { PendingRequestsList, PendingRequest } from '../../components/requests/PendingRequestsList';
import { ConversationsList, Conversation } from '../../components/messages/ConversationsList';
import { ChatWindow } from '../../components/messages/ChatWindow';
import { ProfileSidebar } from '../../components/messages/ProfileSidebar';

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
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const MessengerMain: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    isConnected, 
    connectionStatus, 
    unreadMessagesCount, 
    onlineUsers,
    send,
    subscribe
  } = useOptimizedWebSocketContext();
  
  // Estado local para usuarios escribiendo
  const [typingUsers, setTypingUsers] = useState<Map<string, any>>(new Map());
  
  // Hook para estado de usuarios online
  const { onlineCount, totalUsersCount, getOnlineUsers } = useUserStatus();
  
  const [activeTab, setActiveTab] = useState(0); // 0: Solicitudes, 1: Conversaciones
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Simulación de datos - luego se reemplazará con hooks reales
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([
    {
      id: '1',
      type: 'property_interest',
      sender: {
        id: 'user1',
        name: 'María González',
        avatar: '',
        email: 'maria@email.com',
        phone: '+57 300 123 4567',
        user_type: 'tenant',
        income: 3500000,
        occupation: 'Ingeniera de Software',
        references: ['Empresa ABC', 'Propietario anterior'],
      },
      property: {
        id: 'prop1',
        title: 'Apartamento en El Poblado',
        address: 'Calle 10 # 43-87, El Poblado',
        rent: 2800000,
      },
      message: 'Hola, me interesa mucho su propiedad. Tengo ingresos estables y excelentes referencias. ¿Podríamos coordinar una visita?',
      sent_at: '2024-01-15T10:30:00Z',
      is_read: false,
    },
    {
      id: '2',
      type: 'service_request',
      sender: {
        id: 'user2',
        name: 'Carlos Rodríguez',
        avatar: '',
        email: 'carlos@email.com',
        phone: '+57 310 987 6543',
        user_type: 'service_provider',
        service_type: 'plumbing',
        experience: '8 años',
        certifications: ['SENA Plomería', 'Certificación Gas'],
        rating: 4.8,
      },
      service: {
        id: 'serv1',
        title: 'Reparación de tubería',
        description: 'Necesito reparar una fuga en la cocina',
        budget: 200000,
      },
      message: 'Soy plomero certificado con 8 años de experiencia. Puedo solucionar su problema de plomería de manera rápida y eficiente.',
      sent_at: '2024-01-15T09:15:00Z',
      is_read: false,
    }
  ]);

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv1',
      participants: [
        {
          id: 'user3',
          name: 'Ana Martínez',
          avatar: '',
          user_type: 'tenant',
          is_online: true,
        }
      ],
      last_message: {
        content: '¿A qué hora podemos hacer la visita mañana?',
        sent_at: '2024-01-15T14:20:00Z',
        sender_id: 'user3',
      },
      unread_count: 2,
      context: {
        type: 'property',
        property: {
          title: 'Casa en Rionegro',
          address: 'Cra 25 # 12-34, Rionegro',
        }
      }
    },
    {
      id: 'conv2',
      participants: [
        {
          id: 'user4',
          name: 'Luis Fernández',
          avatar: '',
          user_type: 'service_provider',
          is_online: false,
        }
      ],
      last_message: {
        content: 'Perfecto, quedamos entonces el viernes a las 2 PM',
        sent_at: '2024-01-15T12:45:00Z',
        sender_id: user?.id,
      },
      unread_count: 0,
      context: {
        type: 'service',
        service: {
          title: 'Instalación aire acondicionado',
        }
      }
    }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSelectedConversation(null);
  };

  const handleRequestAction = (requestId: string, action: 'accept' | 'reject') => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    if (action === 'accept') {
      // Crear nueva conversación
      const newConversation = {
        id: `conv_${Date.now()}`,
        participants: [request.sender],
        last_message: {
          content: request.message,
          sent_at: request.sent_at,
          sender_id: request.sender.id,
        },
        unread_count: 1,
        context: request.property ? 
          { type: 'property', property: request.property } :
          { type: 'service', service: request.service }
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveTab(1); // Cambiar a conversaciones
      setSelectedConversation(newConversation);
    }

    // Remover de solicitudes pendientes
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleRequestView = (request: PendingRequest) => {
    setSelectedProfile(request.sender);
    setShowProfileSidebar(true);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowProfileSidebar(false);
    
    // Marcar como leída
    if (conversation.unread_count > 0) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    }
  };

  const getTabLabel = (index: number) => {
    if (index === 0) {
      const count = pendingRequests.filter(r => !r.is_read).length;
      return count > 0 ? `Solicitudes (${count})` : 'Solicitudes';
    } else {
      const count = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
      return count > 0 ? `Conversaciones (${count})` : 'Conversaciones';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'landlord': return <HomeIcon fontSize="small" />;
      case 'tenant': return <PersonIcon fontSize="small" />;
      case 'service_provider': return <BuildIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'property_interest': return 'primary';
      case 'service_request': return 'secondary';
      default: return 'default';
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">
          Necesitas iniciar sesión para acceder a los mensajes
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2, height: 'calc(100vh - 150px)' }}>
      <Paper sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        
        {/* Sidebar izquierdo - Lista de solicitudes/conversaciones */}
        <Box sx={{ width: 400, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header con tabs */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Mensajes</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <OnlineUsersCounter 
                  onlineCount={onlineCount} 
                  totalCount={totalUsersCount}
                  showIcon={true}
                />
                <Chip
                  size="small"
                  icon={<CircleIcon />}
                  label={isConnected ? 'En línea' : 'Desconectado'}
                  color={isConnected ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>
            </Box>
            
            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
              <Tab 
                icon={<NotificationsIcon />} 
                label={getTabLabel(0)}
                iconPosition="start"
              />
              <Tab 
                icon={<ChatIcon />} 
                label={getTabLabel(1)}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Búsqueda */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Lista de contenido */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TabPanel value={activeTab} index={0}>
              {/* Solicitudes pendientes - Usando componente dedicado */}
              <PendingRequestsList
                requests={pendingRequests}
                onlineUsers={onlineUsers}
                searchTerm={searchTerm}
                onRequestAction={handleRequestAction}
                onRequestView={handleRequestView}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              {/* Conversaciones activas - Usando componente dedicado */}
              <ConversationsList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onlineUsers={onlineUsers}
                typingUsers={typingUsers}
                searchTerm={searchTerm}
                onConversationSelect={handleConversationSelect}
              />
            </TabPanel>
          </Box>
        </Box>

        {/* Área principal - Chat o mensaje de bienvenida */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header del chat */}
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      onlineUsers.get(selectedConversation.participants[0].id)?.isOnline ? (
                        <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />
                      ) : null
                    }
                  >
                    <Avatar>
                      {selectedConversation.participants[0].name[0]}
                    </Avatar>
                  </Badge>
                  
                  <Box>
                    <Typography variant="h6">
                      {selectedConversation.participants[0].name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedConversation.context?.property?.title || selectedConversation.context?.service?.title}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small">
                    <PhoneIcon />
                  </IconButton>
                  <IconButton size="small">
                    <VideoCallIcon />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={() => setShowProfileSidebar(!showProfileSidebar)}
                  >
                    <InfoIcon />
                  </IconButton>
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* ChatWindow component real */}
              <ChatWindow
                conversationId={selectedConversation.id}
                recipientId={selectedConversation.participants[0].id}
                recipientName={selectedConversation.participants[0].name}
                contextInfo={selectedConversation.context ? {
                  type: selectedConversation.context.type,
                  title: selectedConversation.context.property?.title || selectedConversation.context.service?.title || '',
                  details: selectedConversation.context.property?.address || selectedConversation.context.service?.description
                } : undefined}
              />
            </>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.50'
            }}>
              <ChatIcon sx={{ fontSize: 72, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                VeriHome Messenger
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
                {activeTab === 0 
                  ? 'Revisa las solicitudes de inquilinos y proveedores de servicios'
                  : 'Selecciona una conversación para comenzar a chatear en tiempo real'
                }
              </Typography>
            </Box>
          )}
        </Box>

        {/* Sidebar derecho - Información del perfil (opcional) */}
        {showProfileSidebar && selectedProfile && (
          <Box sx={{ 
            width: 320, 
            borderLeft: 1, 
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}>
            <ProfileSidebar
              profile={selectedProfile}
              contextInfo={selectedConversation ? {
                type: selectedConversation.context?.type || 'property',
                title: selectedConversation.context?.property?.title || selectedConversation.context?.service?.title || '',
                details: selectedConversation.context
              } : undefined}
              onClose={() => setShowProfileSidebar(false)}
              onBlock={(userId) => {
                console.log('Block user:', userId);
                // Implementar lógica de bloqueo
              }}
              onReport={(userId) => {
                console.log('Report user:', userId);
                // Implementar lógica de reporte
              }}
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default MessengerMain;