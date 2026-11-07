import api from './api';
import type { PublicUser, User } from '@/types';
import type { FeedResponse } from './posts';

export interface UpdateProfileData {
  nombre?: string;
  bio?: string;
  semestre?: number;
}

export async function getUserProfile(userId: string): Promise<PublicUser> {
  const res = await api.get<{ user: PublicUser }>(`/users/${userId}`);
  return res.data.user;
}

export async function updateProfile(data: UpdateProfileData, photo?: File | null, removePhoto = false): Promise<User> {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) form.append(key, String(value));
  }
  if (photo) form.append('photo', photo);
  if (removePhoto) form.append('removePhoto', 'true');
  const res = await api.put<{ message: string; user: User }>('/auth/profile', form, { headers: { 'Content-Type': undefined } });
  return res.data.user;
}

export async function getUserPosts(userId: string, page = 1, limit = 20): Promise<FeedResponse> {
  const res = await api.get<FeedResponse>(`/users/${userId}/posts`, {
    params: { page, limit },
  });
  return res.data;
}
