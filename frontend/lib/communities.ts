import api from './api';
import type { Community, Material, MessagesResponse, CommunityMessage } from '@/types';

export interface CommunitiesParams {
  search?: string;
  materia?: string;
  carrera?: string;
}

export async function getCommunities(params?: CommunitiesParams): Promise<Community[]> {
  const res = await api.get<{ communities: Community[] }>('/communities', { params });
  return res.data.communities;
}

export async function createCommunity(data: {
  nombre: string;
  descripcion?: string;
  materia?: string;
  tema?: string;
  carrera?: string;
}): Promise<Community> {
  const res = await api.post<{ community: Community }>('/communities', data);
  return res.data.community;
}

export async function getCommunity(id: number): Promise<Community> {
  const res = await api.get<{ community: Community }>(`/communities/${id}`);
  return res.data.community;
}

export async function joinCommunity(id: number): Promise<void> {
  await api.post(`/communities/${id}/join`);
}

export async function leaveCommunity(id: number): Promise<void> {
  await api.post(`/communities/${id}/leave`);
}

export async function getMaterials(communityId: number): Promise<Material[]> {
  const res = await api.get<{ materials: Material[] }>(`/communities/${communityId}/materials`);
  return res.data.materials;
}

export async function uploadMaterial(
  communityId: number,
  data: FormData,
  onProgress?: (pct: number) => void
): Promise<Material> {
  const res = await api.post<{ material: Material }>(
    `/communities/${communityId}/materials`,
    data,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    }
  );
  return res.data.material;
}

export async function deleteMaterial(id: number): Promise<void> {
  await api.delete(`/materials/${id}`);
}

export async function getMessages(communityId: number, page = 1): Promise<MessagesResponse> {
  const res = await api.get<MessagesResponse>(`/communities/${communityId}/messages`, {
    params: { page, limit: 50 },
  });
  return res.data;
}

export async function sendMessage(communityId: number, content: string): Promise<CommunityMessage> {
  const res = await api.post<{ data: CommunityMessage }>(`/communities/${communityId}/messages`, { content });
  return res.data.data;
}

/** Extrae el video ID de una URL de YouTube (youtube.com/watch?v=ID o youtu.be/ID) */
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
