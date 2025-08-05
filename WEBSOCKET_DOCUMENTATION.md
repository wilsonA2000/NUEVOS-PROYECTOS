# 🌐 Sistema WebSocket para Mensajería en Tiempo Real - VeriHome

## 📋 Resumen

Este documento describe la implementación completa del sistema WebSocket para mensajería en tiempo real en VeriHome. El sistema permite comunicación bidireccional instantánea entre usuarios, notificaciones push, indicadores de estado y una experiencia de chat moderna.

## 🎯 Características Implementadas

### ✅ Backend (Django + Channels)
- ✅ **Configuración de Django Channels**: Integración completa con ASGI
- ✅ **Consumers WebSocket especializados**: 4 consumers para diferentes funcionalidades
- ✅ **Routing WebSocket**: Enrutamiento organizado para diferentes tipos de conexiones
- ✅ **Autenticación JWT**: Integración con sistema de autenticación existente
- ✅ **Reconexión automática**: Sistema robusto de reconexión en caso de pérdida
- ✅ **Fallback a cache local**: Si Redis no está disponible, usar memoria local

### ✅ Frontend (React + TypeScript)
- ✅ **Hook genérico useWebSocket**: Base para todas las conexiones WebSocket
- ✅ **Hook especializado useRealTimeMessages**: Gestión completa de mensajería
- ✅ **Hook de notificaciones**: Sistema completo de notificaciones push
- ✅ **Componentes de UI**: Lista de mensajes y chat en tiempo real
- ✅ **Centro de notificaciones**: Gestión visual de todas las notificaciones
- ✅ **Integración con React Query**: Sincronización con cache existente

### ✅ Funcionalidades de Tiempo Real
- ✅ **Mensajes instantáneos**: Envío y recepción inmediata
- ✅ **Indicadores de escritura**: "Usuario está escribiendo..."
- ✅ **Estados de lectura**: Confirmaciones de entrega y lectura
- ✅ **Estados de usuario**: Online/offline en tiempo real
- ✅ **Notificaciones push**: Del navegador y en la aplicación
- ✅ **Reconexión automática**: Con backoff exponencial

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│  useWebSocket (genérico)                                    │
│  ├── useRealTimeMessages (mensajería)                       │
│  ├── useRealTimeNotifications (notificaciones)              │
│  └── Componentes UI (RealTimeMessageList, ChatWindow, etc.) │
└─────────────────────────────────────────────────────────────┘
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Django + Channels)                 │
├─────────────────────────────────────────────────────────────┤
│  ASGI Application (verihome/asgi.py)                        │
│  ├── WebSocket Routing (messaging/routing.py)               │
│  ├── Consumers:                                             │
│  │   ├── MessageConsumer (mensajería general)               │
│  │   ├── ThreadConsumer (conversaciones específicas)        │
│  │   ├── NotificationConsumer (notificaciones)              │
│  │   └── UserStatusConsumer (estados de usuario)            │
│  └── Channel Layer (Redis/InMemory)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REDIS (Channel Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  Base 0: Celery                                             │
│  Base 1: Cache general                                      │
│  Base 2: Sesiones                                           │
│  Base 3: Query cache                                        │
│  Base 4: WebSocket channels ← NUEVO                         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos

### Backend
```
verihome/
├── settings.py              ← Configuración Channels añadida
├── asgi.py                  ← Configuración ASGI actualizada
└── urls.py

messaging/
├── consumers.py             ← 4 consumers WebSocket
├── routing.py               ← Rutas WebSocket ✨ NUEVO
├── models.py               
├── api_views.py            
└── ...

install_websocket_dependencies.py  ← Script instalación ✨ NUEVO
```

### Frontend
```
frontend/src/
├── hooks/
│   ├── useWebSocket.ts              ← Hook genérico ✨ NUEVO
│   ├── useRealTimeMessages.ts       ← Hook mensajería ✨ NUEVO
│   ├── useRealTimeNotifications.ts  ← Hook notificaciones ✨ NUEVO
│   └── ...
├── components/
│   ├── messages/
│   │   ├── RealTimeMessageList.tsx      ← Lista en tiempo real ✨ NUEVO
│   │   ├── RealTimeChatWindow.tsx       ← Chat instantáneo ✨ NUEVO
│   │   └── ...
│   └── notifications/
│       └── RealTimeNotificationCenter.tsx ← Centro notificaciones ✨ NUEVO
├── services/
│   └── messageService.ts            ← Integración WebSocket añadida
└── ...
```

## 🚀 Instalación y Configuración

### 1. Ejecutar Script de Instalación
```bash
python install_websocket_dependencies.py
```

### 2. Configuración Manual (Alternativa)

#### Backend Dependencies
```bash
pip install channels>=4.0.0
pip install channels-redis>=4.1.0
pip install redis>=4.5.0
pip install daphne>=4.0.0
```

#### Frontend Dependencies
```bash
cd frontend
npm install date-fns@^2.29.0
npm install @types/ws@^8.5.0
```

### 3. Configurar Variables de Entorno
```bash
# .env
REDIS_URL=redis://localhost:6379
WEBSOCKET_ENABLED=True
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_RECONNECT_ATTEMPTS=5
```

### 4. Iniciar Redis
```bash
# Con Docker
docker run -p 6379:6379 redis:alpine

# Con Redis local
redis-server
```

### 5. Aplicar Migraciones
```bash
python manage.py migrate
```

### 6. Iniciar Servidores
```bash
# Backend (terminal 1)
python manage.py runserver

# Frontend (terminal 2)
cd frontend && npm run dev
```

## 🔌 Rutas WebSocket

| Ruta | Propósito | Consumer |
|------|-----------|----------|
| `/ws/messaging/` | Mensajería general | MessageConsumer |
| `/ws/notifications/` | Notificaciones | NotificationConsumer |
| `/ws/messaging/thread/<id>/` | Conversación específica | ThreadConsumer |
| `/ws/user-status/` | Estados de usuario | UserStatusConsumer |

## 📡 Protocolo de Mensajes

### Mensajes del Cliente → Servidor

#### Mensajería General (`/ws/messaging/`)
```json
{
  "type": "ping",
  "timestamp": "2025-01-01T12:00:00Z"
}

{
  "type": "mark_as_read",
  "message_id": "123"
}

{
  "type": "typing_start",
  "thread_id": "456"
}

{
  "type": "typing_stop", 
  "thread_id": "456"
}

{
  "type": "join_conversation",
  "thread_id": "456"
}

{
  "type": "leave_conversation",
  "thread_id": "456"
}
```

#### Conversación Específica (`/ws/messaging/thread/<id>/`)
```json
{
  "type": "send_message",
  "content": "Hola, ¿cómo estás?"
}

{
  "type": "typing_start"
}

{
  "type": "typing_stop"
}

{
  "type": "mark_messages_read",
  "message_ids": ["123", "124", "125"]
}
```

#### Estados de Usuario (`/ws/user-status/`)
```json
{
  "type": "heartbeat",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Mensajes del Servidor → Cliente

#### Eventos de Conexión
```json
{
  "type": "connection_established",
  "message": "Conexión WebSocket establecida",
  "user_id": 123
}

{
  "type": "pong",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### Mensajes
```json
{
  "type": "new_message",
  "message": {
    "id": "789",
    "content": "Hola!",
    "sender_id": 456,
    "sender_name": "Juan Pérez",
    "thread_id": "123",
    "sent_at": "2025-01-01T12:00:00Z",
    "is_read": false
  }
}

{
  "type": "message_read_receipt",
  "message_id": "789",
  "read_by": "María García",
  "read_at": "2025-01-01T12:01:00Z"
}
```

#### Indicadores de Escritura
```json
{
  "type": "typing_notification",
  "user_id": 456,
  "user_name": "Juan Pérez",
  "thread_id": "123",
  "is_typing": true
}
```

#### Estados de Usuario
```json
{
  "type": "user_status_update",
  "user_id": 456,
  "user_name": "Juan Pérez",
  "is_online": true,
  "last_seen": "2025-01-01T12:00:00Z"
}
```

#### Notificaciones
```json
{
  "type": "general_notification",
  "id": "notif-123",
  "title": "Nueva funcionalidad",
  "message": "Se ha añadido una nueva característica",
  "priority": "medium",
  "action_url": "/app/features",
  "timestamp": "2025-01-01T12:00:00Z"
}

{
  "type": "urgent_notification",
  "id": "notif-urgent-456",
  "title": "¡ATENCIÓN!",
  "message": "Se requiere acción inmediata",
  "priority": "urgent",
  "action_url": "/app/urgent",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## 🎣 Uso de Hooks

### useWebSocket (Genérico)
```typescript
import { useWebSocket } from '../hooks/useWebSocket';

const MyComponent = () => {
  const { socket, isConnected, sendMessage } = useWebSocket({
    url: '/ws/custom/',
    onMessage: (message) => console.log('Received:', message),
    onOpen: () => console.log('Connected'),
    onClose: () => console.log('Disconnected'),
    reconnectAttempts: 5,
    heartbeatInterval: 30000,
  });

  const handleSend = () => {
    sendMessage({ type: 'custom', data: 'hello' });
  };

  return (
    <div>
      <p>Estado: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <button onClick={handleSend}>Enviar</button>
    </div>
  );
};
```

### useRealTimeMessages (Mensajería)
```typescript
import { useRealTimeMessages } from '../hooks/useRealTimeMessages';

const ChatComponent = () => {
  const {
    isConnected,
    sendMessage,
    markMessagesAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    unreadCount,
    joinThread,
  } = useRealTimeMessages();

  useEffect(() => {
    joinThread('thread-123');
  }, []);

  const handleSendMessage = (content: string) => {
    sendMessage('thread-123', content);
  };

  return (
    <div>
      <p>Mensajes sin leer: {unreadCount}</p>
      <p>Conexión: {isConnected ? '🟢' : '🔴'}</p>
      {typingUsers.map(user => (
        <p key={user.userId}>{user.userName} está escribiendo...</p>
      ))}
    </div>
  );
};
```

### useRealTimeNotifications (Notificaciones)
```typescript
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications';

const NotificationComponent = () => {
  const {
    notifications,
    unreadCount,
    enablePushNotifications,
    markAsRead,
    clearNotification,
  } = useRealTimeNotifications();

  return (
    <div>
      <p>Notificaciones: {unreadCount}</p>
      <button onClick={enablePushNotifications}>
        Habilitar Push
      </button>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Marcar leída
          </button>
        </div>
      ))}
    </div>
  );
};
```

## 🧪 Testing

### Probar Conexión WebSocket
```javascript
// En la consola del navegador
const ws = new WebSocket('ws://localhost:8000/ws/messaging/');
ws.onopen = () => console.log('Conectado');
ws.onmessage = (e) => console.log('Mensaje:', JSON.parse(e.data));
ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
```

### Verificar Redis
```bash
redis-cli monitor
# Verás los mensajes de channels en tiempo real
```

### Probar Mensajería
1. Abre la aplicación en dos pestañas diferentes
2. Inicia sesión con usuarios diferentes
3. Envía mensajes entre ellos
4. Verifica que lleguen instantáneamente
5. Comprueba indicadores de escritura y lectura

## 🐛 Solución de Problemas

### WebSocket no se conecta
```bash
# Verificar que el servidor esté corriendo con ASGI
python manage.py runserver
# NO usar: gunicorn (solo para HTTP)
# SÍ usar: daphne (para WebSocket)
```

### Redis no disponible
- El sistema tiene fallback automático a InMemoryChannelLayer
- Verificar que Redis esté corriendo: `redis-cli ping`

### Errores de autenticación
- Verificar que el token JWT sea válido
- Comprobar middleware de autenticación en settings.py

### Reconexión no funciona
- Verificar configuración de `reconnectAttempts` y `reconnectInterval`
- Comprobar que `shouldReconnect` esté configurado correctamente

## 📊 Monitoreo

### Logs del Backend
```python
# En settings.py - ya configurado
LOGGING = {
    'loggers': {
        'messaging': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        }
    }
}
```

### Métricas de Conexión
```python
# Agregar a un consumer para obtener estadísticas
async def get_connection_stats(self):
    return {
        'active_connections': len(self.channel_layer.groups.get('user_status', [])),
        'total_messages_sent': self.message_count,
        'uptime': datetime.now() - self.start_time,
    }
```

## 🔮 Próximas Mejoras

### Funcionalidades Planeadas
- [ ] **Archivos adjuntos**: Envío de imágenes y documentos en tiempo real
- [ ] **Llamadas de voz/video**: Integración con WebRTC
- [ ] **Rooms/Grupos**: Conversaciones grupales
- [ ] **Historial infinito**: Scroll infinito con lazy loading
- [ ] **Mensajes temporales**: Auto-destrucción de mensajes
- [ ] **Reacciones**: Emojis de reacción a mensajes
- [ ] **Mensajes de sistema**: Notificaciones automáticas (usuario se unió, etc.)
- [ ] **Búsqueda en tiempo real**: Búsqueda instantánea mientras escribes

### Optimizaciones Técnicas
- [ ] **Compresión de mensajes**: Compresión automática para mensajes grandes
- [ ] **Rate limiting**: Límites de velocidad para prevenir spam
- [ ] **Clustering**: Soporte para múltiples servidores
- [ ] **Message queuing**: Cola de mensajes para alta concurrencia
- [ ] **Analytics**: Métricas detalladas de uso
- [ ] **A/B Testing**: Framework para pruebas de funcionalidades

## 📞 Soporte

Para soporte o dudas sobre el sistema WebSocket:

1. **Revisar logs**: Verificar consola del navegador y logs de Django
2. **Comprobar Redis**: `redis-cli ping` debe responder `PONG`
3. **Verificar dependencias**: Ejecutar `pip list | grep channels`
4. **Consultar documentación**: Este archivo contiene toda la información necesaria

---

**¡El sistema WebSocket de VeriHome está listo para brindar una experiencia de mensajería en tiempo real excepcional! 🚀**