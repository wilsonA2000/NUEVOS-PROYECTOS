export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'tenant' | 'admin' | 'owner' | 'service_provider';
  created_at: string;
  updated_at: string;
}

export interface UserUpdateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageCreateInput {
  sender_id: number;
  receiver_id: number;
  content: string;
  read: boolean;
}

export interface MessageUpdateInput {
  content?: string;
  read?: boolean;
}

export interface Property {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: 'house' | 'apartment' | 'condo' | 'townhouse';
  status: 'available' | 'rented' | 'maintenance';
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export type PropertyCreateInput = Omit<Property, 'id' | 'created_at' | 'updated_at'>;
export type PropertyUpdateInput = Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>;

export interface MockData {
  get: any[];
  post: any;
  patch: any;
  delete: any;
} 