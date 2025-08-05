// Tipos comunes para respuestas de API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  details?: string;
  field_errors?: Record<string, string[]>;
  status: number;
}

// Tipos para formularios
export interface FormErrors {
  [key: string]: string | string[] | undefined;
}

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Tipos para hooks
export interface QueryHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface MutationHookResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: Error | null;
  data: TData | undefined;
}

// Tipos para filtros comunes
export interface BaseFilters {
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

// Tipos para estados comunes
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type Status = 'active' | 'inactive' | 'pending' | 'cancelled';

// Tipos para archivos
export interface FileUpload {
  file: File;
  progress?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UploadedFile {
  id: number;
  url: string;
  filename: string;
  size: number;
  content_type: string;
  created_at: string;
}