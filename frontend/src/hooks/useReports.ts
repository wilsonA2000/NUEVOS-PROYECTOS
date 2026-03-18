import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Report {
  id: number;
  name: string;
  type: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ReportFilters {
  type?: string;
  status?: string;
  created_by?: number;
}

export const useReports = (filters?: ReportFilters) => {
  const reports = useQuery<Report[]>({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const response = await api.get('/reports/', { params: filters });
      return response.data;
    },
  });

  const generate = useMutation<
    Report,
    Error,
    { name: string; type: string; parameters: Record<string, any> }
  >({
    mutationFn: async (data) => {
      const response = await api.post('/reports/generate/', data);
      return response.data;
    },
  });

  const download = async (id: number) => {
    const response = await api.get(`/reports/${id}/download/`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers['content-disposition']?.split('filename=')[1] || 'report';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return {
    reports,
    generate,
    download,
  };
}; 