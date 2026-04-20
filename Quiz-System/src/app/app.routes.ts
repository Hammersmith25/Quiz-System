import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { StudentHomeComponent } from './components/student-home/student-home';
import { TeacherHomeComponent } from './components/teacher-home/teacher-home';
import { StudentQuizListComponent } from './components/student-quiz-list/student-quiz-list';
import { StudentQuizDetailComponent } from './components/student-quiz-detail/student-quiz-detail';
import { StudentAttemptComponent } from './components/student-attempt/student-attempt';
import { StudentResultComponent } from './components/student-result/student-result';
import { StudentGradesComponent } from './components/student-grades/student-grades';
import { StudentAttemptDetailComponent } from './components/student-attempt-detail/student-attempt-detail';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'student',
    component: StudentHomeComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Student'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'quizzes' },
      { path: 'quizzes', component: StudentQuizListComponent },
      { path: 'quizzes/:quizId', component: StudentQuizDetailComponent },
      { path: 'attempt/:attemptId', component: StudentAttemptComponent },
      { path: 'attempts/:attemptId/result', component: StudentResultComponent },
      { path: 'attempts/:attemptId', component: StudentAttemptDetailComponent },
      { path: 'grades', component: StudentGradesComponent },
    ],
  },
  {
    path: 'teacher',
    component: TeacherHomeComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Teacher'] },
  },
  { path: '**', redirectTo: '' },
];
