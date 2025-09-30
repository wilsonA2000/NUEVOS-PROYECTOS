/**
 * API Configuration
 * Centralized configuration for backend API URLs
 */

// Backend API base URL
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin  // In production, use same origin
  : 'http://localhost:8001';  // In development, use Django backend

// API endpoints
export const API_ENDPOINTS = {
  // Documents API
  documents: {
    upload: `${API_BASE_URL}/api/v1/requests/api/documents/upload/`,
    delete: (id: string) => `${API_BASE_URL}/api/v1/requests/api/documents/${id}/delete/`,
    checklist: (processId: string) => `${API_BASE_URL}/api/v1/requests/api/documents/process/${processId}/checklist/`,
    review: (id: string) => `${API_BASE_URL}/api/v1/requests/api/documents/${id}/review/`,
  },
  
  // Add other API endpoints here as needed
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Media URL helper for serving files
export const buildMediaUrl = (path: string): string => {
  if (!path) return '';
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise, prepend backend URL
  return `${API_BASE_URL}${path}`;
};