import { AxiosStatic } from 'axios';
import { MockData } from '../types';

interface MockAxios extends AxiosStatic {
  __mockData: MockData;
  __setMockData: (data: Partial<MockData>) => void;
  __resetMockData: () => void;
}

const mockData: MockData = {
  get: [],
  post: null,
  patch: null,
  delete: null,
};

const mockAxios = {
  __mockData: mockData,

  __setMockData(data: Partial<MockData>) {
    Object.assign(mockData, data);
  },

  __resetMockData() {
    mockData.get = [];
    mockData.post = null;
    mockData.patch = null;
    mockData.delete = null;
  },

  create: jest.fn().mockImplementation(() => mockAxios),
  get: jest.fn().mockImplementation(() => Promise.resolve({ data: mockData.get })),
  post: jest.fn().mockImplementation((url: string, data: any) => {
    const newItem = { ...data, id: mockData.get.length + 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockData.get.push(newItem);
    return Promise.resolve({ data: newItem });
  }),
  patch: jest.fn().mockImplementation((url: string, data: any) => {
    const id = parseInt(url.split('/').pop() || '0');
    const index = mockData.get.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      mockData.get[index] = { ...mockData.get[index], ...data.data, updated_at: new Date().toISOString() };
      return Promise.resolve({ data: mockData.get[index] });
    }
    return Promise.reject(new Error('Item not found'));
  }),
  delete: jest.fn().mockImplementation((url: string) => {
    const id = parseInt(url.split('/').pop() || '0');
    const index = mockData.get.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      mockData.get.splice(index, 1);
      return Promise.resolve({ data: true });
    }
    return Promise.reject(new Error('Item not found'));
  }),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
} as unknown as MockAxios;

export default mockAxios; 