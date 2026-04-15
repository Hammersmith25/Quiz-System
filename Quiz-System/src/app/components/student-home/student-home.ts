import { Component } from '@angular/core';

@Component({
  selector: 'app-student-home',
  standalone: true,
  templateUrl: './student-home.html',
  styleUrl: './student-home.css'
})
export class StudentHomeComponent {
  activeSection: 'quizzes' | 'results' = 'quizzes';

  setSection(section: 'quizzes' | 'results') {
    this.activeSection = section;
  }
}