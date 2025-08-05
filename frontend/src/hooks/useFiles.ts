import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFiles,
  getFile,
  uploadFile,
  deleteFile,
  downloadFile,
} from '../lib/api';

interface File {
  id: number;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

interface FileFilters {
  type?: string;
  uploaded_by?: number;
}

export const useFiles = (filters?: FileFilters) => {
  const queryClient = useQueryClient();

  const files = useQuery<File[]>({
    queryKey: ['files', filters],
    queryFn: () => getFiles(filters),
  });

  const upload = useMutation<File, Error, FormData>({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const remove = useMutation<void, Error, number>({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const download = async (id: number) => {
    const response = await downloadFile(id);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'file';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return {
    files,
    upload,
    remove,
    download,
  };
}; 