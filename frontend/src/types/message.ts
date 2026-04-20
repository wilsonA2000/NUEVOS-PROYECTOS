export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageDto {
  recipientId: string;
  subject: string;
  content: string;
}

export interface UpdateMessageDto {
  isRead?: boolean;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageFolder {
  id: string;
  name: string;
  color?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}
