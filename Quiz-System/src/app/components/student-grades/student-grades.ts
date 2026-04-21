import { CommonModule } from '@angular/common';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GradeBadgeComponent } from '../grade-badge/grade-badge';
import { QuizService, StudentAttemptHistoryRow } from '../../services/quiz';

@Component({
  selector: 'app-student-grades',
  standalone: true,
  imports: [CommonModule, RouterLink, GradeBadgeComponent],
  templateUrl: './student-grades.html',
  styleUrl: './student-grades.css',
})
export class StudentGradesComponent implements OnInit {
  attempts: StudentAttemptHistoryRow[] = [];
  isLoading = false;
  error = '';

  constructor(private quizService: QuizService, private cdr:ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.error = '';

    this.quizService
      .getStudentHistory()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (attempts) => {
          this.attempts = attempts;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Unable to load your grade history.';
          this.cdr.markForCheck();
        },
      });
  }

  formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not submitted';
  }
}
