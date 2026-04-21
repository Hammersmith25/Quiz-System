import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GradeBadgeComponent } from '../grade-badge/grade-badge';
import { AttemptAnswerResult, AttemptDetail, QuizService } from '../../services/quiz';

@Component({
  selector: 'app-student-attempt-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, GradeBadgeComponent],
  templateUrl: './student-attempt-detail.html',
  styleUrl: './student-attempt-detail.css',
})
export class StudentAttemptDetailComponent implements OnInit {
  attempt: AttemptDetail | null = null;
  isLoading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private quizService: QuizService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));
    if (Number.isNaN(attemptId)) {
      this.error = 'Attempt id is invalid.';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.quizService
      .getAttempt(attemptId)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (attempt) => {
          this.attempt = attempt;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Unable to load this attempt detail.';
          this.cdr.markForCheck();
        },
      });
  }

  selectedAnswerText(answer: AttemptAnswerResult): string {
    if (answer.question_type === 'short_answer') {
      return answer.text_answer || 'No answer';
    }

    if (answer.selected_option_texts.length > 0) {
      return answer.selected_option_texts.join(', ');
    }

    if (answer.selected_option_text) {
      return answer.selected_option_text;
    }

    return 'No answer';
  }

  correctAnswerText(answer: AttemptAnswerResult): string {
    if (answer.question_type === 'short_answer') {
      return answer.correct_text_answer || 'No answer key';
    }

    return answer.correct_option_texts.join(', ') || 'No answer key';
  }
}
