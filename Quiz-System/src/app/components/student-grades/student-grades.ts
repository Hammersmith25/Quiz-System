import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(private quizService: QuizService) {}

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
      }))
      .subscribe({
        next: (attempts) => {
          this.attempts = attempts;
        },
        error: () => {
          this.error = 'Unable to load your grade history.';
        },
      });
  }

  formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not submitted';
  }
}
