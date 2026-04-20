import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './student-home.html',
  styleUrl: './student-home.css',
})
export class StudentHomeComponent {
  constructor(private authService: AuthService) {}

  get studentName(): string {
    const token = this.authService.getToken();
    if (!token) {
      return 'Student';
    }

    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return 'Student';
      }

      const json = JSON.parse(atob(payload)) as { username?: string };
      return json.username || 'Student';
    } catch {
      return 'Student';
    }
  }
}
