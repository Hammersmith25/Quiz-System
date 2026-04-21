import { CommonModule } from '@angular/common';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AttemptSessionService } from '../../services/attempt-session';
import { QuizService, StartAttemptResponse, StudentQuiz } from '../../services/quiz';

@Component({
  selector: 'app-student-quiz-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-quiz-detail.html',
  styleUrl: './student-quiz-detail.css',
})
export class StudentQuizDetailComponent implements OnInit {
  quiz: StudentQuiz | null = null;
  isLoading = false;
  isStarting = false;
  error = '';
  readonly integrityRules = [
    'Work independently and do not use outside help unless your teacher explicitly allows it.',
    'Do not copy answers, share screenshots, or open the quiz for someone else.',
    'Use the Start button only when you are ready to finish the attempt honestly in one sitting.',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private attemptSessionService: AttemptSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQuiz();
  }

  get resumeAttemptId(): number | null {
    if (!this.quiz) {
      return null;
    }

    return this.attemptSessionService.findByQuiz(this.quiz.id)?.attemptId ?? null;
  }

  loadQuiz(): void {
    const quizId = Number(this.route.snapshot.paramMap.get('quizId'));
    if (Number.isNaN(quizId)) {
      this.error = 'Quiz id is invalid.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.quizService
      .getStudentQuiz(quizId)
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (quiz) => {
          this.quiz = quiz;
           this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Unable to load this quiz.';
           this.cdr.markForCheck();
        },
      });
  }

  formatDuration(totalMinutes: number): string {
    const totalSeconds = Math.max(0, Math.floor(Number(totalMinutes) * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  startQuiz(): void {
    if (!this.quiz || this.isStarting) {
      return;
    }

    const activeSession = this.attemptSessionService.findByQuiz(this.quiz.id);
    if (activeSession) {
      this.router.navigate(['/student/attempt', activeSession.attemptId]);
      return;
    }

    this.isStarting = true;
    this.error = '';

    this.quizService
      .startAttempt(this.quiz.id)
      .pipe(finalize(() => {
        this.isStarting = false;
      }))
      .subscribe({
        next: (response) => {
          this.persistSession(response);
          this.router.navigate(['/student/attempt', response.attempt.id]);
        },
        error: () => {
          this.error = 'Unable to start this quiz right now.';
        },
      });
  }

  private persistSession(response: StartAttemptResponse): void {
    const expiresAt = new Date(
      new Date(response.attempt.started_at).getTime() + response.quiz.duration * 60 * 1000,
    ).toISOString();

    this.attemptSessionService.save({
      attemptId: response.attempt.id,
      quiz: response.quiz,
      startedAt: response.attempt.started_at,
      expiresAt,
      answers: {},
    });
  }
}
