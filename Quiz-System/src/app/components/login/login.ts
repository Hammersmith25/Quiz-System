import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  username = '';
  password = '';
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onLogin() {
    this.error = '';

    const data = {
      username: this.username,
      password: this.password
    };

    this.auth.login(data).subscribe({
      next: (res: any) => {
        this.auth.setToken(res.access);
        const role = res.role ?? res.user?.role ?? this.auth.getRole();
        if (role) {
          this.auth.setRole(role);
        }

        this.router.navigate([this.auth.getRoleHomeRoute(role)]);
      },
      error: () => {
        this.auth.clearAuth();
        this.error = 'Invalid credentials';
      }
    });
  }

  mockLogin(role: 'Student' | 'Teacher') {
    this.auth.setToken('mock-token');
    this.auth.setRole(role);
    this.router.navigate([this.auth.getRoleHomeRoute(role)]);
  }
}
