import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription, finalize } from 'rxjs';
import {
  AttemptSessionAnswerState,
  AttemptSessionService,
  AttemptSessionState,
} from '../../services/attempt-session';
import { QuizService, StudentQuizQuestion, SubmitAttemptAnswerPayload } from '../../services/quiz';

@Component({
  selector: 'app-student-attempt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-attempt.html',
  styleUrl: './student-attempt.css',
})
export class StudentAttemptComponent implements OnInit, OnDestroy {
  session: AttemptSessionState | null = null;
  currentQuestionIndex = 0;
  remainingSeconds = 0;
  isSubmitting = false;
  error = '';

  private timerSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private attemptSessionService: AttemptSessionService,
  ) {}

  ngOnInit(): void {
    const attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));
    if (Number.isNaN(attemptId)) {
      this.error = 'Attempt id is invalid.';
      return;
    }

    this.session = this.attemptSessionService.get(attemptId);
    if (!this.session) {
      this.error = 'This attempt session is no longer available in the browser.';
      return;
    }

    this.remainingSeconds = Math.max(
      0,
      Math.floor((new Date(this.session.expiresAt).getTime() - Date.now()) / 1000),
    );
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }

  get quizTitle(): string {
    return this.session?.quiz.title ?? 'Quiz';
  }

  get questions(): StudentQuizQuestion[] {
    return this.session?.quiz.questions ?? [];
  }

  get currentQuestion(): StudentQuizQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get answeredCount(): number {
    return this.questions.filter((question) => this.isAnswered(question.id)).length;
  }

  selectQuestion(index: number): void {
    this.currentQuestionIndex = index;
  }

  isAnswered(questionId: number): boolean {
    const answer = this.answerState(questionId);
    return Boolean(answer.textAnswer.trim() || answer.selectedOptionId || answer.selectedOptionIds.length);
  }

  isCurrentQuestion(index: number): boolean {
    return index === this.currentQuestionIndex;
  }

  isCheckboxQuestion(question: StudentQuizQuestion): boolean {
    return question.question_type === 'multiple_choice' && question.allows_multiple_answers;
  }

  updateRadioAnswer(questionId: number, optionId: number): void {
    const answer = this.answerState(questionId);
    answer.selectedOptionId = optionId;
    answer.selectedOptionIds = [optionId];
    this.persist();
  }

  toggleCheckboxAnswer(questionId: number, optionId: number, checked: boolean): void {
    const answer = this.answerState(questionId);
    const next = new Set(answer.selectedOptionIds);

    if (checked) {
      next.add(optionId);
    } else {
      next.delete(optionId);
    }

    answer.selectedOptionIds = Array.from(next);
    answer.selectedOptionId = answer.selectedOptionIds[0] ?? null;
    this.persist();
  }

  updateTextAnswer(questionId: number, value: string): void {
    const answer = this.answerState(questionId);
    answer.textAnswer = value;
    this.persist();
  }

  isOptionChecked(questionId: number, optionId: number): boolean {
    return this.answerState(questionId).selectedOptionIds.includes(optionId);
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex -= 1;
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex += 1;
    }
  }

  submitAttempt(): void {
    if (!this.session || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const payload = this.buildSubmitPayload();

    this.quizService
      .submitAttempt(this.session.attemptId, payload)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (attempt) => {
          this.timerSubscription?.unsubscribe();
          this.attemptSessionService.clear(this.session!.attemptId);
          this.router.navigate(['/student/attempts', attempt.id, 'result']);
        },
        error: () => {
          this.error = 'Unable to submit your quiz. Please try again.';
        },
      });
  }

  formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  private startTimer(): void {
    this.timerSubscription?.unsubscribe();

    this.timerSubscription = interval(1000).subscribe(() => {
      if (!this.session) {
        return;
      }

      const seconds = Math.max(
        0,
        Math.floor((new Date(this.session.expiresAt).getTime() - Date.now()) / 1000),
      );
      this.remainingSeconds = seconds;

      if (seconds === 0) {
        this.submitAttempt();
      }
    });
  }

  answerState(questionId: number): AttemptSessionAnswerState {
    if (!this.session) {
      return {
        selectedOptionId: null,
        selectedOptionIds: [],
        textAnswer: '',
      };
    }

    const existing = this.session.answers[questionId];
    if (existing) {
      return existing;
    }

    const created: AttemptSessionAnswerState = {
      selectedOptionId: null,
      selectedOptionIds: [],
      textAnswer: '',
    };
    this.session.answers[questionId] = created;
    return created;
  }

  private buildSubmitPayload(): SubmitAttemptAnswerPayload[] {
    return this.questions.map((question) => {
      const answer = this.answerState(question.id);
      const payload: SubmitAttemptAnswerPayload = {
        question: question.id,
      };

      if (question.question_type === 'short_answer') {
        payload.text_answer = answer.textAnswer.trim();
        return payload;
      }

      if (this.isCheckboxQuestion(question)) {
        payload.selected_options = [...answer.selectedOptionIds];
      } else if (answer.selectedOptionId) {
        payload.selected_option = answer.selectedOptionId;
      }

      return payload;
    });
  }

  private persist(): void {
    if (this.session) {
      this.attemptSessionService.save(this.session);
    }
  }
}
