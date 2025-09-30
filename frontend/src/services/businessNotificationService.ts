/**
 * Business Notification Service - Sistema de notificaciones automáticas para interacciones de negocio
 * Maneja todas las notificaciones push + emails automáticos para el flujo entre landlords, tenants y service providers
 */

import { api } from './api';

export interface BusinessInteraction {
  type: 'property_created' | 'property_interest' | 'service_request' | 'request_accepted' | 
        'request_rejected' | 'message_received' | 'payment_received' | 'contract_signed' |
        'contract_created' | 'rating_received' | 'verification_completed' | 'system_alert';
  actor: {
    id: string;
    name: string;
    email: string;
    user_type: 'landlord' | 'tenant' | 'service_provider';
  };
  target: {
    id: string;
    name: string;
    email: string;
    user_type: 'landlord' | 'tenant' | 'service_provider';
  };
  object: {
    type: 'property' | 'service' | 'contract' | 'payment' | 'message' | 'rating';
    id: string;
    title: string;
    details?: any;
  };
  metadata?: {
    amount?: number;
    rating?: number;
    message_preview?: string;
    [key: string]: any;
  };
}

export interface NotificationTemplate {
  push_title: string;
  push_body: string;
  email_subject: string;
  email_template: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  auto_email: boolean;
}

class BusinessNotificationService {
  // Configuración de templates para cada tipo de interacción
  private templates: Record<string, NotificationTemplate> = {
    // ===== PROPIEDADES =====
    property_created: {
      push_title: 'Nueva propiedad disponible',
      push_body: '{actor.name} publicó una nueva propiedad: "{object.title}"',
      email_subject: 'Nueva propiedad publicada en VeriHome',
      email_template: 'property_created',
      priority: 'medium',
      action_url: '/app/properties/{object.id}',
      auto_email: true,
    },

    property_interest: {
      push_title: '¡Alguien está interesado en tu propiedad!',
      push_body: '{actor.name} ({actor.user_type}) está interesado en "{object.title}"',
      email_subject: 'Nuevo interés en tu propiedad - VeriHome',
      email_template: 'property_interest_received',
      priority: 'high',
      action_url: '/app/messages',
      auto_email: true,
    },

    // ===== SERVICIOS =====
    service_request: {
      push_title: 'Nueva solicitud de servicio',
      push_body: '{actor.name} solicita: "{object.title}"',
      email_subject: 'Nueva solicitud de servicio - VeriHome',
      email_template: 'service_request_received',
      priority: 'high',
      action_url: '/app/messages',
      auto_email: true,
    },

    // ===== RESPUESTAS A SOLICITUDES =====
    request_accepted: {
      push_title: '¡Tu solicitud fue aceptada! 🎉',
      push_body: '{actor.name} aceptó tu solicitud para "{object.title}"',
      email_subject: 'Solicitud aceptada - VeriHome',
      email_template: 'request_accepted',
      priority: 'high',
      action_url: '/app/messages',
      auto_email: true,
    },

    request_rejected: {
      push_title: 'Solicitud no aceptada',
      push_body: '{actor.name} no puede atender tu solicitud de "{object.title}"',
      email_subject: 'Actualización de solicitud - VeriHome',
      email_template: 'request_rejected',
      priority: 'medium',
      action_url: '/app/properties',
      auto_email: true,
    },

    // ===== MENSAJES =====
    message_received: {
      push_title: 'Nuevo mensaje de {actor.name}',
      push_body: '{metadata.message_preview}',
      email_subject: 'Nuevo mensaje en VeriHome',
      email_template: 'new_message',
      priority: 'medium',
      action_url: '/app/messages',
      auto_email: false, // Solo notificación push para mensajes
    },

    // ===== PAGOS =====
    payment_received: {
      push_title: 'Pago recibido 💰',
      push_body: '{actor.name} realizó un pago de ${metadata.amount} para "{object.title}"',
      email_subject: 'Pago recibido - VeriHome',
      email_template: 'payment_received',
      priority: 'high',
      action_url: '/app/payments/{object.id}',
      auto_email: true,
    },

    // ===== CONTRATOS =====
    contract_created: {
      push_title: 'Nuevo contrato disponible',
      push_body: '{actor.name} creó un contrato para "{object.title}"',
      email_subject: 'Nuevo contrato - VeriHome',
      email_template: 'contract_created',
      priority: 'high',
      action_url: '/app/contracts/{object.id}',
      auto_email: true,
    },

    contract_signed: {
      push_title: '¡Contrato firmado! ✍️',
      push_body: '{actor.name} firmó el contrato de "{object.title}"',
      email_subject: 'Contrato firmado - VeriHome',
      email_template: 'contract_signed',
      priority: 'urgent',
      action_url: '/app/contracts/{object.id}',
      auto_email: true,
    },

    // ===== CALIFICACIONES =====
    rating_received: {
      push_title: 'Nueva calificación recibida ⭐',
      push_body: '{actor.name} te calificó con {metadata.rating} estrellas',
      email_subject: 'Nueva evaluación recibida - VeriHome',
      email_template: 'rating_received',
      priority: 'medium',
      action_url: '/app/ratings',
      auto_email: true,
    },

    // ===== SISTEMA =====
    verification_completed: {
      push_title: '¡Verificación completada! ✅',
      push_body: 'Tu {metadata.verification_type} ha sido verificado exitosamente',
      email_subject: 'Verificación completada - VeriHome',
      email_template: 'verification_completed',
      priority: 'medium',
      action_url: '/app/profile',
      auto_email: true,
    },

    system_alert: {
      push_title: 'Alerta del sistema',
      push_body: '{metadata.message}',
      email_subject: 'Importante: Actualización de VeriHome',
      email_template: 'system_alert',
      priority: 'medium',
      action_url: '/app/dashboard',
      auto_email: true,
    },
  };

  /**
   * Envía notificación automática para una interacción de negocio
   */
  async sendBusinessNotification(interaction: BusinessInteraction): Promise<void> {
    try {
      const template = this.templates[interaction.type];
      if (!template) {
        console.warn(`No template found for interaction type: ${interaction.type}`);
        return;
      }

      // Procesar el template con los datos de la interacción
      const processedNotification = this.processTemplate(template, interaction);

      // Enviar al backend para procesar
      await api.post('/notifications/business-interaction/', {
        type: interaction.type,
        actor_id: interaction.actor.id,
        target_id: interaction.target.id,
        object_type: interaction.object.type,
        object_id: interaction.object.id,
        metadata: interaction.metadata,
        notification_data: processedNotification,
      });

      console.log(`Business notification sent: ${interaction.type} from ${interaction.actor.name} to ${interaction.target.name}`);
    } catch (error) {
      console.error('Error sending business notification:', error);
    }
  }

  /**
   * Procesa un template reemplazando las variables con datos reales
   */
  private processTemplate(template: NotificationTemplate, interaction: BusinessInteraction): any {
    const replaceVariables = (text: string): string => {
      return text
        .replace(/{actor\.name}/g, interaction.actor.name)
        .replace(/{actor\.user_type}/g, interaction.actor.user_type)
        .replace(/{target\.name}/g, interaction.target.name)
        .replace(/{target\.user_type}/g, interaction.target.user_type)
        .replace(/{object\.title}/g, interaction.object.title)
        .replace(/{object\.type}/g, interaction.object.type)
        .replace(/{object\.id}/g, interaction.object.id)
        .replace(/{metadata\.amount}/g, interaction.metadata?.amount?.toLocaleString() || '')
        .replace(/{metadata\.rating}/g, interaction.metadata?.rating?.toString() || '')
        .replace(/{metadata\.message_preview}/g, interaction.metadata?.message_preview || '')
        .replace(/{metadata\.message}/g, interaction.metadata?.message || '')
        .replace(/{metadata\.verification_type}/g, interaction.metadata?.verification_type || '');
    };

    return {
      push_title: replaceVariables(template.push_title),
      push_body: replaceVariables(template.push_body),
      email_subject: replaceVariables(template.email_subject),
      email_template: template.email_template,
      priority: template.priority,
      action_url: template.action_url?.replace(/{object\.id}/g, interaction.object.id),
      auto_email: template.auto_email,
    };
  }

  // ===== HELPERS PARA CADA TIPO DE INTERACCIÓN =====

  /**
   * Notifica cuando se crea una nueva propiedad
   */
  async notifyPropertyCreated(landlord: any, property: any): Promise<void> {
    // Notificar a todos los usuarios interesados en propiedades similares
    const interestedUsers = await this.getInterestedUsers('property', property);
    
    for (const user of interestedUsers) {
      await this.sendBusinessNotification({
        type: 'property_created',
        actor: {
          id: landlord.id,
          name: landlord.first_name + ' ' + landlord.last_name,
          email: landlord.email,
          user_type: 'landlord',
        },
        target: {
          id: user.id,
          name: user.first_name + ' ' + user.last_name,
          email: user.email,
          user_type: user.user_type,
        },
        object: {
          type: 'property',
          id: property.id,
          title: property.title,
          details: property,
        },
      });
    }
  }

  /**
   * Notifica cuando alguien está interesado en una propiedad
   */
  async notifyPropertyInterest(tenant: any, property: any, landlord: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'property_interest',
      actor: {
        id: tenant.id,
        name: tenant.first_name + ' ' + tenant.last_name,
        email: tenant.email,
        user_type: 'tenant',
      },
      target: {
        id: landlord.id,
        name: landlord.first_name + ' ' + landlord.last_name,
        email: landlord.email,
        user_type: 'landlord',
      },
      object: {
        type: 'property',
        id: property.id,
        title: property.title,
        details: property,
      },
    });
  }

  /**
   * Notifica cuando se solicita un servicio
   */
  async notifyServiceRequest(requester: any, serviceProvider: any, serviceDetails: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'service_request',
      actor: {
        id: requester.id,
        name: requester.first_name + ' ' + requester.last_name,
        email: requester.email,
        user_type: requester.user_type,
      },
      target: {
        id: serviceProvider.id,
        name: serviceProvider.first_name + ' ' + serviceProvider.last_name,
        email: serviceProvider.email,
        user_type: 'service_provider',
      },
      object: {
        type: 'service',
        id: serviceDetails.id,
        title: serviceDetails.title,
        details: serviceDetails,
      },
    });
  }

  /**
   * Notifica cuando se acepta una solicitud
   */
  async notifyRequestAccepted(acceptor: any, requester: any, requestDetails: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'request_accepted',
      actor: {
        id: acceptor.id,
        name: acceptor.first_name + ' ' + acceptor.last_name,
        email: acceptor.email,
        user_type: acceptor.user_type,
      },
      target: {
        id: requester.id,
        name: requester.first_name + ' ' + requester.last_name,
        email: requester.email,
        user_type: requester.user_type,
      },
      object: {
        type: requestDetails.type,
        id: requestDetails.id,
        title: requestDetails.title,
        details: requestDetails,
      },
    });
  }

  /**
   * Notifica cuando se rechaza una solicitud
   */
  async notifyRequestRejected(rejector: any, requester: any, requestDetails: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'request_rejected',
      actor: {
        id: rejector.id,
        name: rejector.first_name + ' ' + rejector.last_name,
        email: rejector.email,
        user_type: rejector.user_type,
      },
      target: {
        id: requester.id,
        name: requester.first_name + ' ' + requester.last_name,
        email: requester.email,
        user_type: requester.user_type,
      },
      object: {
        type: requestDetails.type,
        id: requestDetails.id,
        title: requestDetails.title,
        details: requestDetails,
      },
    });
  }

  /**
   * Notifica cuando se recibe un nuevo mensaje
   */
  async notifyMessageReceived(sender: any, recipient: any, message: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'message_received',
      actor: {
        id: sender.id,
        name: sender.first_name + ' ' + sender.last_name,
        email: sender.email,
        user_type: sender.user_type,
      },
      target: {
        id: recipient.id,
        name: recipient.first_name + ' ' + recipient.last_name,
        email: recipient.email,
        user_type: recipient.user_type,
      },
      object: {
        type: 'message',
        id: message.id,
        title: 'Nuevo mensaje',
        details: message,
      },
      metadata: {
        message_preview: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      },
    });
  }

  /**
   * Notifica cuando se recibe un pago
   */
  async notifyPaymentReceived(payer: any, recipient: any, payment: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'payment_received',
      actor: {
        id: payer.id,
        name: payer.first_name + ' ' + payer.last_name,
        email: payer.email,
        user_type: payer.user_type,
      },
      target: {
        id: recipient.id,
        name: recipient.first_name + ' ' + recipient.last_name,
        email: recipient.email,
        user_type: recipient.user_type,
      },
      object: {
        type: 'payment',
        id: payment.id,
        title: payment.description || 'Pago',
        details: payment,
      },
      metadata: {
        amount: payment.amount,
      },
    });
  }

  /**
   * Notifica cuando se crea un contrato
   */
  async notifyContractCreated(creator: any, signatory: any, contract: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'contract_created',
      actor: {
        id: creator.id,
        name: creator.first_name + ' ' + creator.last_name,
        email: creator.email,
        user_type: creator.user_type,
      },
      target: {
        id: signatory.id,
        name: signatory.first_name + ' ' + signatory.last_name,
        email: signatory.email,
        user_type: signatory.user_type,
      },
      object: {
        type: 'contract',
        id: contract.id,
        title: contract.title,
        details: contract,
      },
    });
  }

  /**
   * Notifica cuando se firma un contrato
   */
  async notifyContractSigned(signer: any, otherParty: any, contract: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'contract_signed',
      actor: {
        id: signer.id,
        name: signer.first_name + ' ' + signer.last_name,
        email: signer.email,
        user_type: signer.user_type,
      },
      target: {
        id: otherParty.id,
        name: otherParty.first_name + ' ' + otherParty.last_name,
        email: otherParty.email,
        user_type: otherParty.user_type,
      },
      object: {
        type: 'contract',
        id: contract.id,
        title: contract.title,
        details: contract,
      },
    });
  }

  /**
   * Notifica cuando se recibe una calificación
   */
  async notifyRatingReceived(rater: any, rated: any, rating: any): Promise<void> {
    await this.sendBusinessNotification({
      type: 'rating_received',
      actor: {
        id: rater.id,
        name: rater.first_name + ' ' + rater.last_name,
        email: rater.email,
        user_type: rater.user_type,
      },
      target: {
        id: rated.id,
        name: rated.first_name + ' ' + rated.last_name,
        email: rated.email,
        user_type: rated.user_type,
      },
      object: {
        type: 'rating',
        id: rating.id,
        title: 'Nueva calificación',
        details: rating,
      },
      metadata: {
        rating: rating.rating,
      },
    });
  }

  /**
   * Obtiene usuarios interesados en un tipo de contenido específico
   */
  private async getInterestedUsers(type: string, object: any): Promise<any[]> {
    try {
      const response = await api.get(`/notifications/interested-users/`, {
        params: { type, object_id: object.id }
      });
      return response.data.users || [];
    } catch (error) {
      console.error('Error getting interested users:', error);
      return [];
    }
  }
}

export const businessNotificationService = new BusinessNotificationService();
export default businessNotificationService;