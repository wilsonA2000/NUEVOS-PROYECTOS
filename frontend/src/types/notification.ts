export type NotificationType = 
  | 'payment_received'
  | 'payment_due'
  | 'contract_expiring'
  | 'maintenance_request'
  | 'message_received'
  | 'system_alert';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, any>;
  userId: number;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
} 