import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizOption {
  id?: number;
  text: string;
  is_correct: boolean;
}

export interface StudentQuizOption {
  id: number;
  text: string;
}

export interface QuizQuestion {
  id?: number;
  text: string;
  question_type: QuestionType;
  points: number;
  correct_text_answer?: string;
  answer_options: QuizOption[];
}

export interface StudentQuizQuestion {
  id: number;
  text: string;
  question_type: QuestionType;
  points: number;
  allows_multiple_answers: boolean;
  answer_options: StudentQuizOption[];
}

export interface TeacherQuiz {
  id: number;
  title: string;
  description: string;
  duration: number;
  max_score: number;
  created_by: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
}

export interface StudentQuiz {
  id: number;
  title: string;
  description: string;
  duration: number;
  max_score: number;
  created_by: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions: StudentQuizQuestion[];
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
  status: string;
  score: number;
  max_score: number;
  percentage: string;
  letter_grade: string;
  started_at: string;
  submitted_at: string;
}

export interface AttemptGrade {
  percentage: string;
  letter_grade: string;
  graded_at: string;
}

export interface AttemptQuizSummary {
  id: number;
  title: string;
  description: string;
  duration: number;
  max_score: number;
}

export interface AttemptAnswerResult {
  question: number;
  question_text: string;
  question_type: QuestionType;
  selected_option: number | null;
  selected_option_text: string;
  selected_options: number[];
  selected_option_texts: string[];
  text_answer: string;
  is_correct: boolean;
  correct_option_ids: number[];
  correct_option_texts: string[];
  correct_text_answer: string;
}

export interface AttemptDetail {
  id: number;
  quiz: number;
  quiz_summary: AttemptQuizSummary;
  student: number;
  started_at: string;
  submitted_at: string | null;
  status: string;
  score: number;
  max_score: number;
  percentage: string;
  grade: AttemptGrade | null;
  answers: AttemptAnswerResult[];
}

export interface StudentAttemptHistoryRow {
  id: number;
  quiz: number;
  quiz_title: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  percentage: string;
  letter_grade: string;
}

export interface StartAttemptResponse {
  attempt: AttemptDetail;
  quiz: StudentQuiz;
}

export interface SubmitAttemptAnswerPayload {
  question: number;
  selected_option?: number;
  selected_options?: number[];
  text_answer?: string;
}

type ListResponse<T> = T[] | { results?: T[] };

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly apiBaseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getTeacherQuizzes(): Observable<TeacherQuiz[]> {
    return this.http
      .get<ListResponse<TeacherQuiz>>(`${this.apiBaseUrl}/quizzes/`)
      .pipe(map((response) => this.unwrapListResponse(response)));
  }

  getStudentQuizzes(): Observable<StudentQuiz[]> {
    return this.http
      .get<ListResponse<StudentQuiz>>(`${this.apiBaseUrl}/quizzes/`)
      .pipe(map((response) => this.unwrapListResponse(response)));
  }

  getStudentQuiz(quizId: number): Observable<StudentQuiz> {
    return this.http.get<StudentQuiz>(`${this.apiBaseUrl}/quizzes/${quizId}/`);
  }

  createQuiz(payload: TeacherQuizPayload): Observable<TeacherQuiz> {
    return this.http.post<TeacherQuiz>(`${this.apiBaseUrl}/quizzes/`, payload);
  }

  updateQuiz(quizId: number, payload: TeacherQuizPayload): Observable<TeacherQuiz> {
    return this.http.put<TeacherQuiz>(`${this.apiBaseUrl}/quizzes/${quizId}/`, payload);
  }

  deleteQuiz(quizId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/quizzes/${quizId}/`);
  }

  publishQuiz(quizId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.apiBaseUrl}/quizzes/${quizId}/publish/`, {});
  }

  unpublishQuiz(quizId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.apiBaseUrl}/quizzes/${quizId}/unpublish/`, {});
  }

  getQuizResults(quizId: number): Observable<QuizResultRow[]> {
    return this.http.get<QuizResultRow[]>(`${this.apiBaseUrl}/quizzes/${quizId}/results/`);
  }

  startAttempt(quizId: number): Observable<StartAttemptResponse> {
    return this.http.post<StartAttemptResponse>(`${this.apiBaseUrl}/attempt/start/`, { quiz_id: quizId });
  }

  submitAttempt(attemptId: number, answers: SubmitAttemptAnswerPayload[]): Observable<AttemptDetail> {
    return this.http.post<AttemptDetail>(`${this.apiBaseUrl}/attempt/submit/`, {
      attempt_id: attemptId,
      answers,
    });
  }

  getAttempt(attemptId: number): Observable<AttemptDetail> {
    return this.http.get<AttemptDetail>(`${this.apiBaseUrl}/attempts/${attemptId}/`);
  }

  getStudentHistory(): Observable<StudentAttemptHistoryRow[]> {
    return this.http
      .get<ListResponse<StudentAttemptHistoryRow>>(`${this.apiBaseUrl}/history/`)
      .pipe(map((response) => this.unwrapListResponse(response)));
  }

  private unwrapListResponse<T>(response: ListResponse<T>): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }
}
