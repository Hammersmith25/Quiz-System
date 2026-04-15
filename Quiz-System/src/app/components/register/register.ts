import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  username = '';
  email = '';
  role = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  isSubmitting = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onRegister() {
    this.error = '';
    this.success = '';
    this.isSubmitting = true;

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      this.isSubmitting = false;
      return;
    }

    const data = {
      username: this.username,
      email: this.email,
      role: this.role,
      password: this.password
    };

    this.auth.register(data).subscribe({
      next: (res: any) => {
        this.success = 'Account created successfully';
        this.isSubmitting = false;

        const role = res?.role ?? res?.user?.role ?? this.role;
        if (res?.access) {
          this.auth.setToken(res.access);
          this.auth.setRole(role);
          this.router.navigate([this.auth.getRoleHomeRoute(role)], { replaceUrl: true });
          return;
        }

        this.router.navigate(['/'], { replaceUrl: true });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error =
          err?.error?.detail ??
          err?.error?.message ??
          'Unable to create account';
      }
    });
  }
}
