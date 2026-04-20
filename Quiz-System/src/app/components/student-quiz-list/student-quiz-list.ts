import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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
          this.quizzes = quizzes;
        },
        error: () => {
          this.error = 'Unable to load published quizzes right now.';
        },
      });
  }

  getAttemptLabel(quizId: number): string {
    return this.attemptSessionService.findByQuiz(quizId) ? 'Resume attempt' : 'Open details';
  }

  hasInProgressAttempt(quizId: number): boolean {
    return this.attemptSessionService.findByQuiz(quizId) !== null;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }
}
