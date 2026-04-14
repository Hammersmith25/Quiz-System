import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';


export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'register', component: RegisterComponent }
];
