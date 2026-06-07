import api from './api';
import type { Post, Comment, PostType, PostCategory, ReactionType, ReactionCounts } from '@/types';

export interface CreatePostData {
  content: string;
  type: PostType;
  category: PostCategory;
}

export interface FeedResponse {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReactResponse {
  message: string;
  userReaction: ReactionType | null;
  reactions: ReactionCounts;
}

export async function getPosts(params?: {
  type?: PostType;
  category?: PostCategory;
  page?: number;
  limit?: number;
}): Promise<FeedResponse> {
  const res = await api.get<FeedResponse>('/posts', { params });
  return res.data;
}

export async function createPost(data: CreatePostData): Promise<Post> {
  const res = await api.post<{ message: string; post: Post }>('/posts', data);
  return res.data.post;
}

export async function updatePost(
  postId: number,
  data: Pick<Partial<CreatePostData>, 'content' | 'category'>
): Promise<Post> {
  const res = await api.put<{ message: string; post: Post }>(`/posts/${postId}`, data);
  return res.data.post;
}

export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function reactToPost(postId: number, reaction: ReactionType): Promise<ReactResponse> {
  const res = await api.post<ReactResponse>(`/posts/${postId}/react`, { reaction });
  return res.data;
}

export async function getComments(postId: number, page = 1, limit = 20): Promise<CommentsResponse> {
  const res = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
    params: { page, limit },
  });
  return res.data;
}

export async function addComment(postId: number, content: string): Promise<Comment> {
  const res = await api.post<{ message: string; comment: Comment }>(
    `/posts/${postId}/comments`,
    { content }
  );
  return res.data.comment;
}
