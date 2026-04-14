import { Component } from '@angular/core';

@Component({
  selector: 'app-teacher-home',
  standalone: true,
  templateUrl: './teacher-home.html',
  styleUrl: './teacher-home.css'
})
export class TeacherHomeComponent {
  activeSection: 'create' | 'results' = 'create';

  setSection(section: 'create' | 'results') {
    this.activeSection = section;
  }
}
