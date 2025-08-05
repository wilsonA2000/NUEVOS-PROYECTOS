export interface Rating {
  id: number;
  reviewer: {
    id: number;
    name: string;
    email: string;
  };
  reviewee: {
    id: number;
    name: string;
    email: string;
  };
  overall_rating: number;
  cleanliness_rating?: number;
  communication_rating?: number;
  check_in_rating?: number;
  accuracy_rating?: number;
  location_rating?: number;
  value_rating?: number;
  comment?: string;
  rating_type: string;
  created_at: string;
  updated_at: string;
}

export interface RatingCreateInput {
  reviewee_id: number;
  overall_rating: number;
  cleanliness_rating?: number;
  communication_rating?: number;
  check_in_rating?: number;
  accuracy_rating?: number;
  location_rating?: number;
  value_rating?: number;
  comment?: string;
  rating_type: string;
}

export interface RatingUpdateInput {
  overall_rating?: number;
  cleanliness_rating?: number;
  communication_rating?: number;
  check_in_rating?: number;
  accuracy_rating?: number;
  location_rating?: number;
  value_rating?: number;
  comment?: string;
  rating_type?: string;
}

export interface RatingFilters {
  search?: string;
  rating_type?: string;
  min_rating?: number;
  max_rating?: number;
  reviewer_id?: number;
  reviewee_id?: number;
  start_date?: string;
  end_date?: string;
} 