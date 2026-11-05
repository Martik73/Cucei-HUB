import api from './api';
import type { Professor, Subject, Evaluation } from '@/types';

export interface EvaluationsResponse {
  evaluations: Evaluation[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateEvaluationData {
  subjectId: string;
  rating: number;
  comment?: string;
  semestre: number;
}

export interface CreateEvaluationResult {
  evaluation: Evaluation;
  professorStats: { avgRating: number; totalEvaluations: number };
}

export async function getProfessors(params?: {
  search?: string;
  subject?: string;
  semestre?: number;
}): Promise<Professor[]> {
  const res = await api.get<{ professors: Professor[] }>('/professors', { params });
  return res.data.professors;
}

export async function getProfessor(id: string): Promise<Professor> {
  const res = await api.get<{ professor: Professor }>(`/professors/${id}`);
  return res.data.professor;
}

export async function getEvaluations(
  professorId: string,
  params?: { subject?: string; semestre?: number; page?: number; limit?: number }
): Promise<EvaluationsResponse> {
  const res = await api.get<EvaluationsResponse>(`/professors/${professorId}/evaluations`, { params });
  return res.data;
}

export async function createEvaluation(
  professorId: string,
  data: CreateEvaluationData
): Promise<CreateEvaluationResult> {
  const res = await api.post<CreateEvaluationResult>(`/professors/${professorId}/evaluations`, data);
  return res.data;
}

export async function getSubjects(carrera?: string): Promise<Subject[]> {
  const res = await api.get<{ subjects: Subject[] }>('/subjects', {
    params: carrera ? { carrera } : undefined,
  });
  return res.data.subjects;
}
