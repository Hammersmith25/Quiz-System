import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { StudentHomeComponent } from './components/student-home/student-home';
import { TeacherHomeComponent } from './components/teacher-home/teacher-home';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';


export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
      path: 'student',
      component: StudentHomeComponent,
      canActivate: [authGuard, roleGuard],
      data: { roles: ['Student'] }
    },
    {
      path: 'teacher',
      component: TeacherHomeComponent,
      canActivate: [authGuard, roleGuard],
      data: { roles: ['Teacher'] }
    },
    { path: '**', redirectTo: '' }
];
