export interface User {
  id: number;
  full_name: string;
  email: string;
  avatar: string | null;
}

export interface Property {
  id: number;
  title: string;
  address: string;
}

export interface Contract {
  id: number;
  property: Property;
  tenant: User;
  owner: User;
}

export interface Message {
  id: number;
  subject: string;
  content: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
  recipient: {
    id: number;
    name: string;
    email: string;
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Thread {
  id: number;
  subject: string;
  last_message: string;
  last_message_date: string;
  participants: User[];
  messages: Message[];
  is_starred: boolean;
  is_archived: boolean;
  conversation_type: 'general' | 'property' | 'contract';
  property?: Property;
  contract?: Contract;
}

export interface CreateThreadData {
  recipients: string[];
  subject: string;
  content: string;
  conversation_type: string;
  property?: string;
  contract?: string;
}

export interface MessageFilters {
  search?: string;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
  senderId?: number;
  recipientId?: number;
}

export type MessageFormData = Omit<Message, 'id' | 'created_at' | 'updated_at' | 'sender' | 'recipient' | 'is_read'> & {
  recipient_id: number;
}; 