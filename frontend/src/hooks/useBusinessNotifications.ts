/**
 * useBusinessNotifications - Hook para manejar notificaciones automáticas de interacciones de negocio
 * Integra el sistema de notificaciones push + emails con los componentes de la aplicación
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { businessNotificationService, BusinessInteraction } from '../services/businessNotificationService';

export interface NotificationTrigger {
  // Propiedades
  onPropertyCreated: (property: any) => Promise<void>;
  onPropertyInterest: (property: any, message?: string) => Promise<void>;
  
  // Servicios
  onServiceRequest: (serviceProvider: any, serviceDetails: any) => Promise<void>;
  
  // Respuestas a solicitudes
  onRequestAccepted: (requester: any, requestDetails: any) => Promise<void>;
  onRequestRejected: (requester: any, requestDetails: any) => Promise<void>;
  
  // Mensajes
  onMessageSent: (recipient: any, message: any) => Promise<void>;
  
  // Pagos
  onPaymentReceived: (payer: any, payment: any) => Promise<void>;
  
  // Contratos
  onContractCreated: (signatory: any, contract: any) => Promise<void>;
  onContractSigned: (otherParty: any, contract: any) => Promise<void>;
  
  // Calificaciones
  onRatingGiven: (rated: any, rating: any) => Promise<void>;
  
  // Sistema
  onVerificationCompleted: (verificationType: string) => Promise<void>;
  onSystemAlert: (message: string, targetUsers?: any[]) => Promise<void>;
}

export const useBusinessNotifications = (): NotificationTrigger => {
  const { user } = useAuth();

  const onPropertyCreated = useCallback(async (property: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyPropertyCreated(user, property);
    } catch (error) {
      console.error('Error sending property created notification:', error);
    }
  }, [user]);

  const onPropertyInterest = useCallback(async (property: any, message?: string) => {
    if (!user || !property.landlord) return;
    
    try {
      await businessNotificationService.notifyPropertyInterest(user, property, property.landlord);
    } catch (error) {
      console.error('Error sending property interest notification:', error);
    }
  }, [user]);

  const onServiceRequest = useCallback(async (serviceProvider: any, serviceDetails: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyServiceRequest(user, serviceProvider, serviceDetails);
    } catch (error) {
      console.error('Error sending service request notification:', error);
    }
  }, [user]);

  const onRequestAccepted = useCallback(async (requester: any, requestDetails: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyRequestAccepted(user, requester, requestDetails);
    } catch (error) {
      console.error('Error sending request accepted notification:', error);
    }
  }, [user]);

  const onRequestRejected = useCallback(async (requester: any, requestDetails: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyRequestRejected(user, requester, requestDetails);
    } catch (error) {
      console.error('Error sending request rejected notification:', error);
    }
  }, [user]);

  const onMessageSent = useCallback(async (recipient: any, message: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyMessageReceived(user, recipient, message);
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }, [user]);

  const onPaymentReceived = useCallback(async (payer: any, payment: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyPaymentReceived(payer, user, payment);
    } catch (error) {
      console.error('Error sending payment received notification:', error);
    }
  }, [user]);

  const onContractCreated = useCallback(async (signatory: any, contract: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyContractCreated(user, signatory, contract);
    } catch (error) {
      console.error('Error sending contract created notification:', error);
    }
  }, [user]);

  const onContractSigned = useCallback(async (otherParty: any, contract: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyContractSigned(user, otherParty, contract);
    } catch (error) {
      console.error('Error sending contract signed notification:', error);
    }
  }, [user]);

  const onRatingGiven = useCallback(async (rated: any, rating: any) => {
    if (!user) return;
    
    try {
      await businessNotificationService.notifyRatingReceived(user, rated, rating);
    } catch (error) {
      console.error('Error sending rating notification:', error);
    }
  }, [user]);

  const onVerificationCompleted = useCallback(async (verificationType: string) => {
    if (!user) return;
    
    try {
      await businessNotificationService.sendBusinessNotification({
        type: 'verification_completed',
        actor: {
          id: 'system',
          name: 'Sistema VeriHome',
          email: 'system@verihome.com',
          user_type: 'landlord', // placeholder
        },
        target: {
          id: user.id,
          name: user.first_name + ' ' + user.last_name,
          email: user.email,
          user_type: user.user_type,
        },
        object: {
          type: 'verification' as any,
          id: 'verification',
          title: 'Verificación',
        },
        metadata: {
          verification_type: verificationType,
        },
      });
    } catch (error) {
      console.error('Error sending verification completed notification:', error);
    }
  }, [user]);

  const onSystemAlert = useCallback(async (message: string, targetUsers?: any[]) => {
    if (!user) return;
    
    try {
      const users = targetUsers || [user];
      
      for (const targetUser of users) {
        await businessNotificationService.sendBusinessNotification({
          type: 'system_alert',
          actor: {
            id: 'system',
            name: 'Sistema VeriHome',
            email: 'system@verihome.com',
            user_type: 'landlord', // placeholder
          },
          target: {
            id: targetUser.id,
            name: targetUser.first_name + ' ' + targetUser.last_name,
            email: targetUser.email,
            user_type: targetUser.user_type,
          },
          object: {
            type: 'system' as any,
            id: 'system',
            title: 'Alerta del sistema',
          },
          metadata: {
            message,
          },
        });
      }
    } catch (error) {
      console.error('Error sending system alert notification:', error);
    }
  }, [user]);

  return {
    onPropertyCreated,
    onPropertyInterest,
    onServiceRequest,
    onRequestAccepted,
    onRequestRejected,
    onMessageSent,
    onPaymentReceived,
    onContractCreated,
    onContractSigned,
    onRatingGiven,
    onVerificationCompleted,
    onSystemAlert,
  };
};

export default useBusinessNotifications;