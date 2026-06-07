import api from './api';
import type { PublicUser, User } from '@/types';
import type { FeedResponse } from './posts';

export interface UpdateProfileData {
  nombre?: string;
  bio?: string;
  semestre?: number;
}

export async function getUserProfile(userId: number): Promise<PublicUser> {
  const res = await api.get<{ user: PublicUser }>(`/users/${userId}`);
  return res.data.user;
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const res = await api.put<{ message: string; user: User }>('/auth/profile', data);
  return res.data.user;
}

export async function getUserPosts(userId: number, page = 1, limit = 20): Promise<FeedResponse> {
  const res = await api.get<FeedResponse>(`/users/${userId}/posts`, {
    params: { page, limit },
  });
  return res.data;
}
