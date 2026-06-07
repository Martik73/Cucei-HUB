import api, { TOKEN_KEY } from './api';
import type { AuthResponse, LoginData, RegisterData, User } from '@/types';

export async function login(data: LoginData): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function getProfile(): Promise<User> {
  const res = await api.get<{ user: User }>('/auth/me');
  return res.data.user;
}

export const tokenStorage = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,

  set: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
  },

  remove: (): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  },
};
