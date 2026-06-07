import axios from 'axios';
import type { ApiError } from '@/types';

const TOKEN_KEY = 'cucei_token';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el JWT de localStorage en cada petición autenticada
// Attach JWT from localStorage to every authenticated request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Limpia el token si el servidor responde 401 (expirado / inválido)
// Clear token on 401 — AuthContext will handle redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

/** Extrae el mensaje de error de una respuesta de Axios */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors?.length) return data.errors[0].msg;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
}

export { TOKEN_KEY };
export default api;
