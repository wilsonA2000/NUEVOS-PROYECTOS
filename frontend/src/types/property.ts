export interface Property {
  id: string; // UUID field
  landlord: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  title: string;
  description: string;
  property_type: 'apartment' | 'house' | 'studio' | 'penthouse' | 'townhouse' | 'commercial' | 'office' | 'warehouse' | 'land' | 'room';
  listing_type: 'rent' | 'sale' | 'both';
  status: 'available' | 'rented' | 'maintenance' | 'pending' | 'inactive';
  
  // Location
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  
  // Physical characteristics
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  total_area: number;
  built_area?: number;
  lot_area?: number;
  parking_spaces: number;
  floors: number;
  floor_number?: number;
  year_built?: number;
  
  // Pricing
  rent_price?: number;
  sale_price?: number;
  security_deposit?: number;
  maintenance_fee?: number;
  
  // Lease conditions
  minimum_lease_term: number;
  maximum_lease_term?: number;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  furnished: boolean;
  utilities_included: string[];
  
  // Additional information
  property_features: string[];
  nearby_amenities: string[];
  transportation: string[];
  
  // Availability
  available_from?: string;
  last_updated: string;
  created_at: string;
  
  // Metrics
  views_count: number;
  favorites_count: number;
  
  // Visibility settings
  is_featured: boolean;
  is_active: boolean;
  
  // Related data
  images: PropertyImage[];
  videos: PropertyVideo[];
  amenity_relations: PropertyAmenityRelation[];
  main_image_url?: string;
  formatted_price: string;
  is_favorited: boolean;
}

export interface PropertyImage {
  id: string;
  image: string;
  image_url: string;
  caption: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

export interface PropertyVideo {
  id: string;
  video: string;
  video_url: string;
  youtube_url?: string;
  title: string;
  description: string;
  duration?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  category: 'interior' | 'exterior' | 'security' | 'recreation' | 'utilities' | 'parking' | 'accessibility';
  icon: string;
  description: string;
  is_active: boolean;
}

export interface PropertyAmenityRelation {
  id: string;
  amenity: PropertyAmenity;
  amenity_id: string;
  available: boolean;
  notes: string;
}

export interface PropertyFavorite {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  property: string;
  property_title: string;
  created_at: string;
}

export interface PropertyView {
  id: string;
  property: string;
  user?: string;
  ip_address?: string;
  user_agent: string;
  viewed_at: string;
  session_key: string;
}

export interface PropertyInquiry {
  id: string;
  property: string;
  property_title: string;
  inquirer: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  subject: string;
  message: string;
  preferred_contact_method: 'email' | 'phone' | 'message';
  move_in_date?: string;
  lease_duration?: number;
  budget_min?: number;
  budget_max?: number;
  status: 'new' | 'contacted' | 'viewing_scheduled' | 'closed';
  response: string;
  responded_at?: string;
  created_at: string;
}

export interface CreatePropertyDto {
  title: string;
  description: string;
  property_type: Property['property_type'];
  listing_type: Property['listing_type'];
  status: Property['status'];
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  total_area: number;
  built_area?: number;
  lot_area?: number;
  parking_spaces: number;
  floors: number;
  floor_number?: number;
  year_built?: number;
  rent_price?: number;
  sale_price?: number;
  security_deposit?: number;
  maintenance_fee?: number;
  minimum_lease_term: number;
  maximum_lease_term?: number;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  furnished: boolean;
  utilities_included: string[];
  property_features: string[];
  nearby_amenities: string[];
  transportation: string[];
  available_from?: string;
  is_featured: boolean;
  is_active: boolean;
}

export interface UpdatePropertyDto {
  title?: string;
  description?: string;
  property_type?: Property['property_type'];
  listing_type?: Property['listing_type'];
  status?: Property['status'];
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  half_bathrooms?: number;
  total_area?: number;
  built_area?: number;
  lot_area?: number;
  parking_spaces?: number;
  floors?: number;
  floor_number?: number;
  year_built?: number;
  rent_price?: number;
  sale_price?: number;
  security_deposit?: number;
  maintenance_fee?: number;
  minimum_lease_term?: number;
  maximum_lease_term?: number;
  pets_allowed?: boolean;
  smoking_allowed?: boolean;
  furnished?: boolean;
  utilities_included?: string[];
  property_features?: string[];
  nearby_amenities?: string[];
  transportation?: string[];
  available_from?: string;
  is_featured?: boolean;
  is_active?: boolean;
}

export interface PropertySearchFilters {
  // Basic search
  search?: string;
  property_type?: string;
  listing_type?: string;
  status?: string;
  city?: string;
  state?: string;
  
  // Price range
  min_price?: number;
  max_price?: number;
  
  // Area range  
  min_area?: number;
  max_area?: number;
  
  // Rooms and bathrooms
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  
  // Amenities and features
  has_parking?: boolean;
  has_pool?: boolean;
  allows_pets?: boolean;
  is_furnished?: boolean;
  
  // Additional filters
  pets_allowed?: boolean;
  furnished?: boolean;
  
  // Ordering and pagination
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PropertyStats {
  total_properties: number;
  available_properties: number;
  rented_properties: number;
  maintenance_properties: number;
  total_views: number;
  total_favorites: number;
  average_price: number;
  occupancy_rate: number;
}

export interface PropertyFiltersResponse {
  property_types: Array<{ value: string; label: string }>;
  listing_types: Array<{ value: string; label: string }>;
  cities: string[];
  states: string[];
  price_ranges: Array<{ min: number; max: number; label: string }>;
  bedroom_options: number[];
} 