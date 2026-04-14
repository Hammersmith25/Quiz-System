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
  department = '';
  role = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onRegister() {
    this.error = '';
    this.success = '';

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    const data = {
      username: this.username,
      email: this.email,
      department: this.department,
      role: this.role,
      password: this.password
    };

    this.auth.register(data).subscribe({
      next: () => {
        this.success = 'Account created successfully';

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 800);
      },
      error: () => {
        this.error = 'Unable to create account';
      }
    });
  }
}
