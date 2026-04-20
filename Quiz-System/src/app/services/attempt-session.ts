import { Injectable } from '@angular/core';
import { StudentQuiz } from './quiz';

export interface AttemptSessionAnswerState {
  selectedOptionId: number | null;
  selectedOptionIds: number[];
  textAnswer: string;
}

export interface AttemptSessionState {
  attemptId: number;
  quiz: StudentQuiz;
  startedAt: string;
  expiresAt: string;
  answers: Record<number, AttemptSessionAnswerState>;
}

@Injectable({
  providedIn: 'root',
})
export class AttemptSessionService {
  private readonly storagePrefix = 'quiz-attempt-session:';

  save(session: AttemptSessionState): void {
    sessionStorage.setItem(this.storageKey(session.attemptId), JSON.stringify(session));
  }

  get(attemptId: number): AttemptSessionState | null {
    const raw = sessionStorage.getItem(this.storageKey(attemptId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AttemptSessionState;
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        this.clear(attemptId);
        return null;
      }
      return parsed;
    } catch {
      this.clear(attemptId);
      return null;
    }
  }

  findByQuiz(quizId: number): AttemptSessionState | null {
    const sessions = this.list();
    return sessions.find((session) => session.quiz.id === quizId) ?? null;
  }

  list(): AttemptSessionState[] {
    const sessions: AttemptSessionState[] = [];

    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key || !key.startsWith(this.storagePrefix)) {
        continue;
      }

      const attemptId = Number(key.replace(this.storagePrefix, ''));
      if (Number.isNaN(attemptId)) {
        continue;
      }

      const session = this.get(attemptId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((left, right) => right.attemptId - left.attemptId);
  }

  clear(attemptId: number): void {
    sessionStorage.removeItem(this.storageKey(attemptId));
  }

  private storageKey(attemptId: number): string {
    return `${this.storagePrefix}${attemptId}`;
  }
}
