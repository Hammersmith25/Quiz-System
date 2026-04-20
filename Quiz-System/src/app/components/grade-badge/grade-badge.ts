import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-grade-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grade-badge.html',
  styleUrl: './grade-badge.css',
})
export class GradeBadgeComponent {
  readonly grade = input<string | null | undefined>('');

  get normalizedGrade(): string {
    return (this.grade() ?? '').toUpperCase() || 'N/A';
  }

  get gradeClass(): string {
    switch (this.normalizedGrade) {
      case 'A':
        return 'grade-a';
      case 'B':
        return 'grade-b';
      case 'C':
        return 'grade-c';
      case 'D':
      case 'F':
        return 'grade-f';
      default:
        return 'grade-neutral';
    }
  }
}
