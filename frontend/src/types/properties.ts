export interface Property {
  id: number;
  title: string;
  description: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  property_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PropertyFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  status?: string;
}

export type PropertyFormData = Omit<Property, 'id' | 'created_at' | 'updated_at' | 'owner'>; 