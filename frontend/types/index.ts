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

// ─── Evaluación Docente ────────────────────────────────────────────────────

export interface Professor {
  id: number;
  nombre: string;
  departamento: string;
  avgRating: number;
  totalEvaluations: number;
  createdAt: string;
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  nombre: string;
  carrera: string;
}

export interface Evaluation {
  id: number;
  professorId: number;
  subjectId: number;
  studentId: number;
  rating: number;
  comment: string;
  semestre: number;
  createdAt: string;
  studentNombre: string;
  subjectNombre: string;
}

// ─── Perfil público ────────────────────────────────────────────────────────

export interface PublicUser {
  id: number;
  nombre: string;
  email: string;
  carrera: string;
  semestre: number;
  bio: string;
  profilePicture: string;
  createdAt: string;
}

// ─── Paginación ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Comunidades / Material Educativo ──────────────────────────────────────

export interface Community {
  id: number;
  nombre: string;
  descripcion: string;
  materia: string;
  tema: string;
  carrera: string;
  creatorId: number;
  creatorNombre: string;
  memberCount: number;
  materialCount: number;
  isMember: boolean;
  createdAt: string;
}

export type MaterialType = 'pdf' | 'youtube';

export interface Material {
  id: number;
  communityId: number;
  uploaderId: number;
  titulo: string;
  descripcion: string;
  tipo: MaterialType;
  fileUrl: string | null;
  youtubeUrl: string | null;
  uploaderNombre: string;
  uploaderPicture: string;
  createdAt: string;
}

export interface CommunityMessage {
  id: number;
  communityId: number;
  userId: number;
  content: string;
  userNombre: string;
  userPicture: string;
  createdAt: string;
}

export interface MessagesResponse {
  messages: CommunityMessage[];
  total: number;
  page: number;
  totalPages: number;
}
