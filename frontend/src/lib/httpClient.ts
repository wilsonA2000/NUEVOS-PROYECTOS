interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

const API_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:8000';

async function httpClient(endpoint: string, options: RequestOptions = {}) {
  const { params, ...customConfig } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...customConfig.headers,
  };

  const config = {
    ...customConfig,
    headers,
  };

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      return Promise.reject(data);
    }
  } catch (error) {
    return Promise.reject(error);
  }
}

export default httpClient;
