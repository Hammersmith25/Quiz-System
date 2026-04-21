import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'token';
  private roleKey = 'role';
  private apiUrl = 'http://localhost:8000/api/auth/';

  constructor(private http: HttpClient, private router: Router) {}

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  setRole(role: string) {
    localStorage.setItem(this.roleKey, this.normalizeRole(role));
  }

  getRole(): string | null {
    const storedRole = localStorage.getItem(this.roleKey);
    if (storedRole) {
      return this.normalizeRole(storedRole);
    }

    const token = this.getToken();
    if (!token) {
      return null;
    }

    const tokenRole = this.extractRoleFromToken(token);
    if (!tokenRole) {
      return null;
    }

    const normalized = this.normalizeRole(tokenRole);
    localStorage.setItem(this.roleKey, normalized);
    return normalized;
  }

  clearAuth() {
    this.removeToken();
    localStorage.removeItem(this.roleKey);
  }

  getRoleHomeRoute(role?: string | null): string {
    const resolvedRole = this.normalizeRole(role ?? this.getRole() ?? '');
    return resolvedRole === 'Teacher' ? '/teacher' : '/student';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  login(credentials: any) {
    return this.http.post(`${this.apiUrl}login/`, credentials);
  }

  register(payload: any) {
    return this.http.post(`${this.apiUrl}register/`, payload);
  }

  logout() {
    this.http.post(`${this.apiUrl}logout/`, {}).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout()
    });
  }

  private finalizeLogout() {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  private normalizeRole(role: string): string {
    const normalized = role.trim().toLowerCase();
    return normalized === 'teacher' ? 'Teacher' : 'Student';
  }

  private extractRoleFromToken(token: string): string | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const json = JSON.parse(atob(payload));
      return (
        json.role ??
        json.user_role ??
        json.user?.role ??
        (json.is_teacher ? 'Teacher' : null) ??
        (json.is_student ? 'Student' : null) ??
        null
      );
    } catch {
      return null;
    }
  }
}