export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  property_type: 'house' | 'apartment' | 'condo';
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  price: number;
  status: 'available' | 'rented' | 'maintenance';
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyFilters {
  status?: Property['status'];
  property_type?: Property['property_type'];
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
}

export interface MessageFilters {
  is_read?: boolean;
  sender_id?: number;
  recipient_id?: number;
} 