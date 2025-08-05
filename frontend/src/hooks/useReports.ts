import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getReports,
  getReport,
  generateReport,
  downloadReport,
} from '../lib/api';

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
    queryFn: () => getReports(filters),
  });

  const generate = useMutation<
    Report,
    Error,
    { name: string; type: string; parameters: Record<string, any> }
  >({
    mutationFn: generateReport,
  });

  const download = async (id: number) => {
    const response = await downloadReport(id);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'report';
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