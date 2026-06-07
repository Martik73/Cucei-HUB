import api from './api';
import type { Professor, Subject, Evaluation } from '@/types';

export interface EvaluationsResponse {
  evaluations: Evaluation[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateEvaluationData {
  subjectId: number;
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
  subject?: number;
  semestre?: number;
}): Promise<Professor[]> {
  const res = await api.get<{ professors: Professor[] }>('/professors', { params });
  return res.data.professors;
}

export async function getProfessor(id: number): Promise<Professor> {
  const res = await api.get<{ professor: Professor }>(`/professors/${id}`);
  return res.data.professor;
}

export async function getEvaluations(
  professorId: number,
  params?: { subject?: number; semestre?: number; page?: number; limit?: number }
): Promise<EvaluationsResponse> {
  const res = await api.get<EvaluationsResponse>(`/professors/${professorId}/evaluations`, { params });
  return res.data;
}

export async function createEvaluation(
  professorId: number,
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
