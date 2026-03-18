import axios from 'axios';

// Usar proxy de Vite en desarrollo, URL directa en producción
const isDevelopment = import.meta.env.DEV;
const baseURL = isDevelopment ? '/api/v1' : 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Propiedades
export const getProperties = async (filters?: any) => {
  const { data } = await api.get('/properties/', { params: filters });
  return data;
};

export const getProperty = async (id: number) => {
  const { data } = await api.get(`/properties/${id}/`);
  return data;
};

export const createProperty = async (property: any) => {
  const { data } = await api.post('/properties/', property);
  return data;
};

export const updateProperty = async (id: number, property: any) => {
  const { data } = await api.put(`/properties/${id}/`, property);
  return data;
};

export const deleteProperty = async (id: number) => {
  await api.delete(`/properties/${id}/`);
};

// Mensajes
export const getMessages = async (filters?: any) => {
  const { data } = await api.get('/messages/', { params: filters });
  return data;
};

export const getMessage = async (id: number) => {
  const { data } = await api.get(`/messages/${id}/`);
  return data;
};

export const createMessage = async (message: any) => {
  const { data } = await api.post('/messages/', message);
  return data;
};

export const updateMessage = async (id: number, message: any) => {
  const { data } = await api.put(`/messages/${id}/`, message);
  return data;
};

export const deleteMessage = async (id: number) => {
  await api.delete(`/messages/${id}/`);
};

// Usuario
export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me/');
  return data;
};

export const updateUser = async (userData: any) => {
  const { data } = await api.put('/auth/profile/', userData);
  return data;
};

// Autenticación
export const login = async (credentials: { email: string; password: string }) => {
  const { data } = await api.post('/auth/login/', credentials);
  return data;
};

export const register = async (userData: any) => {
  const { data } = await api.post('/auth/register/', userData);
  return data;
};

export const logout = async () => {
  await api.post('/auth/logout/');
  localStorage.removeItem('token');
};

// Pagos
export const getPayments = async (filters?: any) => {
  const { data } = await api.get('/payments/', { params: filters });
  return data;
};

export const getPayment = async (id: number) => {
  const { data } = await api.get(`/payments/${id}/`);
  return data;
};

export const createPayment = async (payment: any) => {
  const { data } = await api.post('/payments/', payment);
  return data;
};

export const updatePayment = async (id: number, payment: any) => {
  const { data } = await api.put(`/payments/${id}/`, payment);
  return data;
};

export const deletePayment = async (id: number) => {
  await api.delete(`/payments/${id}/`);
};

export const markPaymentAsPaid = (id: number) =>
  api.post(`/payments/${id}/mark_as_paid/`);

export const cancelPayment = (id: number) =>
  api.post(`/payments/${id}/cancel/`);

// Contratos
export const getContracts = async (filters?: any) => {
  const { data } = await api.get('/contracts/', { params: filters });
  return data;
};

export const getContract = async (id: number) => {
  const { data } = await api.get(`/contracts/${id}/`);
  return data;
};

export const createContract = async (contract: any) => {
  const { data } = await api.post('/contracts/', contract);
  return data;
};

export const updateContract = async (id: number, contract: any) => {
  const { data } = await api.put(`/contracts/${id}/`, contract);
  return data;
};

export const deleteContract = async (id: number) => {
  await api.delete(`/contracts/${id}/`);
};

// Servicios
export const getServices = async (filters?: any) => {
  const { data } = await api.get('/services/', { params: filters });
  return data;
};

export const getService = async (id: number) => {
  const { data } = await api.get(`/services/${id}/`);
  return data;
};

export const createService = async (service: any) => {
  const { data } = await api.post('/services/', service);
  return data;
};

export const updateService = async (id: number, service: any) => {
  const { data } = await api.put(`/services/${id}/`, service);
  return data;
};

export const deleteService = async (id: number) => {
  await api.delete(`/services/${id}/`);
};

// Solicitudes de Servicio
export const getServiceRequests = async (filters?: any) => {
  const { data } = await api.get('/service-requests/', { params: filters });
  return data;
};

export const getServiceRequest = async (id: number) => {
  const { data } = await api.get(`/service-requests/${id}/`);
  return data;
};

export const createServiceRequest = async (request: any) => {
  const { data } = await api.post('/service-requests/', request);
  return data;
};

export const updateServiceRequest = async (id: number, request: any) => {
  const { data } = await api.put(`/service-requests/${id}/`, request);
  return data;
};

export const deleteServiceRequest = async (id: number) => {
  await api.delete(`/service-requests/${id}/`);
};

// Ratings
export const getRatings = async (filters?: any) => {
  const { data } = await api.get('/ratings/', { params: filters });
  return data;
};

export const getRating = async (id: number) => {
  const { data } = await api.get(`/ratings/${id}/`);
  return data;
};

export const createRating = async (rating: any) => {
  const { data } = await api.post('/ratings/', rating);
  return data;
};

export const updateRating = async (id: number, rating: any) => {
  const { data } = await api.put(`/ratings/${id}/`, rating);
  return data;
};

export const deleteRating = async (id: number) => {
  await api.delete(`/ratings/${id}/`);
};

// Analytics
export const getDashboardStats = async () => {
  const { data } = await api.get('/analytics/dashboard/');
  return data;
};

export const getIncomeChart = async (period: string = 'monthly') => {
  const { data } = await api.get(`/analytics/income/${period}/`);
  return data;
};

export const getOccupancyChart = async (period: string = 'monthly') => {
  const { data } = await api.get(`/analytics/occupancy/${period}/`);
  return data;
};

export const getRecentActivity = async (limit: number = 10) => {
  const { data } = await api.get('/analytics/recent-activity/', { params: { limit } });
  return data;
};

// Notificaciones
export const getNotifications = async (filters?: any) => {
  const { data } = await api.get('/notifications/', { params: filters });
  return data;
};

export const markNotificationAsRead = async (id: number) => {
  const { data } = await api.put(`/notifications/${id}/read/`);
  return data;
};

export const markAllNotificationsAsRead = async () => {
  const { data } = await api.put('/notifications/mark-all-read/');
  return data;
};

export const deleteNotification = async (id: number) => {
  await api.delete(`/notifications/${id}/`);
};

// Reportes
export const generateReport = async (type: string, filters?: any) => {
  const { data } = await api.post('/reports/generate/', { type, filters });
  return data;
};

export const getReportHistory = async () => {
  const { data } = await api.get('/reports/history/');
  return data;
};

export const downloadReport = async (id: number) => {
  const { data } = await api.get(`/reports/${id}/download/`, { responseType: 'blob' });
  return data;
};

// Archivos
export const uploadFile = async (file: File, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  const { data } = await api.post('/files/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteFile = async (id: number) => {
  await api.delete(`/files/${id}/`);
};

// Usuarios
export const getUsers = async (filters?: any) => {
  const { data } = await api.get('/users/', { params: filters });
  return data;
};

export const getUser = async (id: number) => {
  const { data } = await api.get(`/users/${id}/`);
  return data;
};

export const createUser = async (user: any) => {
  const { data } = await api.post('/users/', user);
  return data;
};

export const updateUserById = async (id: number, user: any) => {
  const { data } = await api.put(`/users/${id}/`, user);
  return data;
};

export const deleteUser = async (id: number) => {
  await api.delete(`/users/${id}/`);
};

// Configuraciones
export const getSettings = async () => {
  const { data } = await api.get('/settings/');
  return data;
};

export const updateSettings = async (settings: any) => {
  const { data } = await api.put('/settings/', settings);
  return data;
};

// Logs
export const getLogs = async (filters?: any) => {
  const { data } = await api.get('/logs/', { params: filters });
  return data;
};

export const getLog = async (id: number) => {
  const { data } = await api.get(`/logs/${id}/`);
  return data;
};

// Backups
export const createBackup = async () => {
  const { data } = await api.post('/backups/create/');
  return data;
};

export const getBackups = async () => {
  const { data } = await api.get('/backups/');
  return data;
};

export const downloadBackup = async (id: number) => {
  const { data } = await api.get(`/backups/${id}/download/`, { responseType: 'blob' });
  return data;
};

export const deleteBackup = async (id: number) => {
  await api.delete(`/backups/${id}/`);
};

// Imports
export const importData = async (file: File, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  const { data } = await api.post('/imports/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getImportHistory = async () => {
  const { data } = await api.get('/imports/history/');
  return data;
};

export const getImportStatus = async (id: number) => {
  const { data } = await api.get(`/imports/${id}/status/`);
  return data;
};

// Exports
export const exportData = async (type: string, filters?: any) => {
  const { data } = await api.post('/exports/', { type, filters });
  return data;
};

export const getExportHistory = async () => {
  const { data } = await api.get('/exports/history/');
  return data;
};

export const downloadExport = async (id: number) => {
  const { data } = await api.get(`/exports/${id}/download/`, { responseType: 'blob' });
  return data;
}; 