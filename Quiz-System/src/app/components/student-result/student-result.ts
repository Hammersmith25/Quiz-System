import { CommonModule } from '@angular/common';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GradeBadgeComponent } from '../grade-badge/grade-badge';
import { AttemptDetail, QuizService } from '../../services/quiz';

@Component({
  selector: 'app-student-result',
  standalone: true,
  imports: [CommonModule, RouterLink, GradeBadgeComponent],
  templateUrl: './student-result.html',
  styleUrl: './student-result.css',
})
export class StudentResultComponent implements OnInit {
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
    this.cdr.markForCheck();
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
          this.error = 'Unable to load this result screen.';
          this.cdr.markForCheck();
        },
      });
  }

  get correctCount(): number {
    return this.attempt?.answers.filter((answer) => answer.is_correct).length ?? 0;
  }

  get wrongCount(): number {
    return this.attempt?.answers.filter((answer) => !answer.is_correct).length ?? 0;
  }
}
