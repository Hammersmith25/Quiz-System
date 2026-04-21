import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AttemptSessionService } from '../../services/attempt-session';
import { QuizService, StudentQuiz } from '../../services/quiz';

@Component({
  selector: 'app-student-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-quiz-list.html',
  styleUrl: './student-quiz-list.css',
})
export class StudentQuizListComponent implements OnInit {
  quizzes: StudentQuiz[] = [];
  isLoading = false;
  error = '';

  constructor(
    private quizService: QuizService,
    private attemptSessionService: AttemptSessionService,
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.isLoading = true;
    this.error = '';

    this.quizService
      .getStudentQuizzes()
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (quizzes) => {
          this.quizzes = quizzes.filter((quiz) => quiz.is_published);
          if (quizzes.length === 0) {
            this.error = '';
          }
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.error = 'Your session is invalid or expired. Please log in again.';
            return;
          }

          if (error.status === 403) {
            this.error = 'Only students can open the published quiz list.';
            return;
          }

          this.error = this.extractApiMessage(error) || 'Unable to load published quizzes right now.';
        },
      });
  }

  getAttemptLabel(quizId: number): string {
    return this.attemptSessionService.findByQuiz(quizId) ? 'Resume attempt' : 'Open details';
  }

  hasInProgressAttempt(quizId: number): boolean {
    return this.attemptSessionService.findByQuiz(quizId) !== null;
  }

  getQuestionCount(quiz: StudentQuiz): number {
    return Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }

  private extractApiMessage(error: HttpErrorResponse): string {
    const payload = error.error;

    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      if (typeof payload.detail === 'string') {
        return payload.detail;
      }

      const firstEntry = Object.values(payload)[0];
      if (Array.isArray(firstEntry) && firstEntry.length > 0) {
        return String(firstEntry[0]);
      }

      if (typeof firstEntry === 'string') {
        return firstEntry;
      }
    }

    return '';
  }
}
