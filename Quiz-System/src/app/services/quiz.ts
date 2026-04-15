import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizOption {
  id?: number;
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id?: number;
  text: string;
  question_type: QuestionType;
  points: number;
  correct_text_answer?: string;
  answer_options: QuizOption[];
}

export interface TeacherQuiz {
  id: number;
  title: string;
  description: string;
  created_by: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
}

export interface TeacherQuizPayload {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizResultRow {
  id: number;
  student_id: number;
  student_username: string;
  score: number;
  max_score: number;
  percentage: string;
  letter_grade: string;
  submitted_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/quizzes/';

  constructor(private http: HttpClient) {}

  getTeacherQuizzes(): Observable<TeacherQuiz[]> {
    return this.http.get<TeacherQuiz[]>(this.apiBaseUrl);
  }

  createQuiz(payload: TeacherQuizPayload): Observable<TeacherQuiz> {
    return this.http.post<TeacherQuiz>(this.apiBaseUrl, payload);
  }

  updateQuiz(quizId: number, payload: TeacherQuizPayload): Observable<TeacherQuiz> {
    return this.http.put<TeacherQuiz>(`${this.apiBaseUrl}${quizId}/`, payload);
  }

  deleteQuiz(quizId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}${quizId}/`);
  }

  publishQuiz(quizId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.apiBaseUrl}${quizId}/publish/`, {});
  }

  unpublishQuiz(quizId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.apiBaseUrl}${quizId}/unpublish/`, {});
  }

  getQuizResults(quizId: number): Observable<QuizResultRow[]> {
    return this.http.get<QuizResultRow[]>(`${this.apiBaseUrl}${quizId}/results/`);
  }
}
