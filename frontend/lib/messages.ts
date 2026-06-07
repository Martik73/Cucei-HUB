import api from './api';
import type { Conversation, Message, SearchUser } from '@/types';

export interface HistoryResponse {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
  with: { id: number; nombre: string; carrera: string; email: string; profilePicture: string };
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<{ conversations: Conversation[] }>('/messages/conversations');
  return res.data.conversations;
}

export async function getHistory(userId: number, page = 1, limit = 30): Promise<HistoryResponse> {
  const res = await api.get<HistoryResponse>(`/messages/${userId}`, {
    params: { page, limit },
  });
  return res.data;
}

export async function searchUsers(query: string): Promise<SearchUser[]> {
  if (!query.trim()) return [];
  const res = await api.get<{ users: SearchUser[] }>('/users', {
    params: { search: query.trim() },
  });
  return res.data.users;
}
