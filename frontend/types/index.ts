// ─── Modelos del dominio ───────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  nombre: string;
  carrera: string;
  semestre: number;
  bio: string;
  profilePicture: string;
  rol: 'student' | 'admin';
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  carrera: string;
  semestre: number;
  bio?: string;
}

// ─── API ───────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: Array<{ msg: string; path: string; value?: string }>;
}

// ─── Posts ─────────────────────────────────────────────────────────────────

export type PostType     = 'general' | 'carrera';
export type PostCategory = 'duda' | 'evento' | 'trabajo' | 'general';
export type ReactionType = 'like' | 'love' | 'celebrate';

export interface ReactionCounts {
  like: number;
  love: number;
  celebrate: number;
}

export interface Post {
  id: number;
  authorId: number;
  content: string;
  type: PostType;
  category: PostCategory;
  carrera: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields from feed query
  authorNombre?: string;
  authorCarrera?: string;
  authorPicture?: string;
  reactionCount?: number;
  reactions?: ReactionCounts;
  commentCount?: number;
  userReaction?: ReactionType | null;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: string;
  authorNombre?: string;
  authorPicture?: string;
}

// ─── Mensajes ──────────────────────────────────────────────────────────────

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: number;
  createdAt: string;
  senderNombre?: string;
  receiverNombre?: string;
}

export interface Conversation {
  userId: number;
  nombre: string;
  email: string;
  profilePicture: string;
  carrera: string;
  lastMessageId: number;
  lastContent: string;
  lastSenderId: number;
  lastRead: number;
  lastCreatedAt: string;
  unreadCount: number;
}

export interface SearchUser {
  id: number;
  nombre: string;
  carrera: string;
  email: string;
}

// ─── Paginación ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
