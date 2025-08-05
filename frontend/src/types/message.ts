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