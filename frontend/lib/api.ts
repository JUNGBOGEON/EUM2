const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
}

export const api = {
  auth: {
    me: () => fetchApi<User>('/auth/me'),
    logout: () => fetchApi<{ message: string }>('/auth/logout'),
    getGoogleAuthUrl: () => `${API_URL}/api/auth/google`,
  },
  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    create: (data: CreateWorkspaceDto) =>
      fetchApi<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => fetchApi<Workspace>(`/workspaces/${id}`),
    delete: (id: string) =>
      fetchApi<void>(`/workspaces/${id}`, {
        method: 'DELETE',
      }),
  },
};
