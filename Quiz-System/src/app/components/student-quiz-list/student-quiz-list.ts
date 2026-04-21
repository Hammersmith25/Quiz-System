import { CommonModule } from '@angular/common';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
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
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
    
  }

  loadQuizzes(): void {
    this.isLoading = true;
    this.error = '';

    this.quizService.getStudentQuizzes().subscribe({
      next: (quizzes) => {
        console.log('Component received:', quizzes);

        this.quizzes = quizzes;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('API Error:', err);
        this.error = 'Unable to load your quizzes right now.';
        this.isLoading = false;
         this.cdr.markForCheck();
      }
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

  formatDuration(totalMinutes: number): string {
    const totalSeconds = Math.max(0, Math.floor(Number(totalMinutes) * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
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
