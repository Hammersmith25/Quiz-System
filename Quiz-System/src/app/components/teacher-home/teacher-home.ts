import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {FormArray,ReactiveFormsModule,UntypedFormBuilder,UntypedFormGroup,Validators,} from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';
import {QuestionType,QuizQuestion,QuizResultRow,QuizService,TeacherQuiz,TeacherQuizPayload,} from '../../services/quiz';

@Component({
  selector: 'app-teacher-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teacher-home.html',
  styleUrl: './teacher-home.css'
})
export class TeacherHomeComponent implements OnInit {
  activeSection: 'list' | 'builder' | 'results' = 'list';
  quizzes: TeacherQuiz[] = [];
  quizResults: QuizResultRow[] = [];
  selectedResultsQuizId: number | null = null;
  editingQuizId: number | null = null;
  isLoadingQuizzes = false;
  isSavingQuiz = false;
  isLoadingResults = false;
  listError = '';
  builderError = '';
  builderSuccess = '';
  resultsError = '';

  readonly quizForm: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private quizService: QuizService,
    public authService: AuthService,
  ) {
    this.quizForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      questions: this.formBuilder.array([]),
    });
  }

  ngOnInit(): void {
    this.loadQuizzes();
  }

  get teacherName(): string {
    const token = this.authService.getToken();
    if (!token) {
      return 'Teacher';
    }

    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return 'Teacher';
      }

      const json = JSON.parse(atob(payload)) as { username?: string };
      return json.username || 'Teacher';
    } catch {
      return 'Teacher';
    }
  }

  get questionForms(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  get selectedResultsQuiz(): TeacherQuiz | undefined {
    return this.quizzes.find((quiz) => quiz.id === this.selectedResultsQuizId);
  }

  get builderHeading(): string {
    return this.editingQuizId === null ? 'Create quiz' : 'Edit quiz';
  }

  get builderButtonLabel(): string {
    return this.editingQuizId === null ? 'Save new quiz' : 'Update quiz';
  }

  get totalPoints(): number {
    return this.questionForms.controls.reduce((total, control) => {
      const points = Number(control.get('points')?.value ?? 0);
      return total + (Number.isFinite(points) ? points : 0);
    }, 0);
  }

  setSection(section: 'list' | 'builder' | 'results'): void {
    this.activeSection = section;

    if (section === 'results' && this.selectedResultsQuizId !== null) {
      this.loadResults(this.selectedResultsQuizId);
    }
  }

  loadQuizzes(): void {
    this.isLoadingQuizzes = true;
    this.listError = '';

    this.quizService
      .getTeacherQuizzes()
      .pipe(finalize(() => {
        this.isLoadingQuizzes = false;
      }))
      .subscribe({
        next: (quizzes) => {
          this.quizzes = quizzes;

          if (this.selectedResultsQuizId !== null) {
            const exists = quizzes.some((quiz) => quiz.id === this.selectedResultsQuizId);
            if (!exists) {
              this.selectedResultsQuizId = quizzes[0]?.id ?? null;
              this.quizResults = [];
            }
          }
        },
        error: () => {
          this.listError = 'Unable to load your quizzes right now.';
        },
      });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      error: () => {
      },
    });
  }

  createQuiz(): void {
    this.editingQuizId = null;
    this.builderError = '';
    this.builderSuccess = '';
    this.quizForm.reset({
      title: '',
      description: '',
    });
    this.questionForms.clear();
    this.addQuestion();
    this.setSection('builder');
  }

  editQuiz(quiz: TeacherQuiz): void {
    this.editingQuizId = quiz.id;
    this.builderError = '';
    this.builderSuccess = '';
    this.quizForm.patchValue({
      title: quiz.title,
      description: quiz.description,
    });
    this.questionForms.clear();

    if (quiz.questions.length === 0) {
      this.addQuestion();
    } else {
      quiz.questions.forEach((question) => {
        this.questionForms.push(this.createQuestionForm(question));
      });
    }

    this.setSection('builder');
  }

  duplicateQuiz(quiz: TeacherQuiz): void {
    this.editingQuizId = null;
    this.builderError = '';
    this.builderSuccess = '';
    this.quizForm.patchValue({
      title: `${quiz.title} Copy`,
      description: quiz.description,
    });
    this.questionForms.clear();
    quiz.questions.forEach((question) => {
      this.questionForms.push(this.createQuestionForm({
        ...question,
        id: undefined,
        answer_options: question.answer_options.map((option) => ({
          ...option,
          id: undefined,
        })),
      }));
    });
    this.setSection('builder');
  }

  saveQuiz(): void {
    this.builderError = '';
    this.builderSuccess = '';

    if (!this.validateBuilder()) {
      return;
    }

    const payload = this.buildPayload();
    this.isSavingQuiz = true;

    const request$ = this.editingQuizId === null
      ? this.quizService.createQuiz(payload)
      : this.quizService.updateQuiz(this.editingQuizId, payload);

    request$
      .pipe(finalize(() => {
        this.isSavingQuiz = false;
      }))
      .subscribe({
        next: (quiz) => {
          this.builderSuccess = this.editingQuizId === null
            ? 'Quiz created successfully.'
            : 'Quiz updated successfully.';
          this.editingQuizId = quiz.id;
          this.selectedResultsQuizId = quiz.id;
          this.loadQuizzes();
        },
        error: (error) => {
          this.builderError = this.extractApiError(error, 'Unable to save this quiz.');
        },
      });
  }

  deleteQuiz(quiz: TeacherQuiz): void {
    const confirmed = window.confirm(`Delete "${quiz.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.listError = '';

    this.quizService.deleteQuiz(quiz.id).subscribe({
      next: () => {
        if (this.editingQuizId === quiz.id) {
          this.createQuiz();
        }

        if (this.selectedResultsQuizId === quiz.id) {
          this.selectedResultsQuizId = null;
          this.quizResults = [];
        }

        this.loadQuizzes();
      },
      error: (error) => {
        this.listError = this.extractApiError(error, 'Unable to delete this quiz.');
      },
    });
  }

  togglePublish(quiz: TeacherQuiz): void {
    this.listError = '';

    const request$ = quiz.is_published
      ? this.quizService.unpublishQuiz(quiz.id)
      : this.quizService.publishQuiz(quiz.id);

    request$.subscribe({
      next: () => {
        const nextPublishedState = !quiz.is_published;

        if (this.editingQuizId === quiz.id) {
          this.builderSuccess = nextPublishedState
            ? 'Quiz published successfully.'
            : 'Quiz moved back to draft.';
        }

        this.loadQuizzes();
      },
      error: (error) => {
        this.listError = this.extractApiError(error, 'Unable to change publish status.');
      },
    });
  }

  showResults(quiz: TeacherQuiz): void {
    this.selectedResultsQuizId = quiz.id;
    this.setSection('results');
    this.loadResults(quiz.id);
  }

  loadResults(quizId: number): void {
    this.resultsError = '';
    this.isLoadingResults = true;

    this.quizService
      .getQuizResults(quizId)
      .pipe(finalize(() => {
        this.isLoadingResults = false;
      }))
      .subscribe({
        next: (results) => {
          this.quizResults = results;
        },
        error: (error) => {
          this.quizResults = [];
          this.resultsError = this.extractApiError(error, 'Unable to load quiz results.');
        },
      });
  }

  onResultsQuizChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.selectedResultsQuizId = Number.isNaN(value) ? null : value;

    if (this.selectedResultsQuizId !== null) {
      this.loadResults(this.selectedResultsQuizId);
    }
  }

  addQuestion(): void {
    this.questionForms.push(this.createQuestionForm());
  }

  removeQuestion(index: number): void {
    this.questionForms.removeAt(index);
  }

  answerOptions(questionIndex: number): FormArray {
    return this.questionForms.at(questionIndex).get('answer_options') as FormArray;
  }

  addOption(questionIndex: number): void {
    this.answerOptions(questionIndex).push(this.createOptionForm());
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const questionForm = this.questionForms.at(questionIndex) as UntypedFormGroup;
    const questionType = questionForm.get('question_type')?.value as QuestionType;
    const options = this.answerOptions(questionIndex);

    if (questionType === 'true_false' || options.length <= 2) {
      return;
    }

    options.removeAt(optionIndex);

    if (!options.controls.some((control) => control.get('is_correct')?.value === true) && options.length > 0) {
      options.at(0).get('is_correct')?.setValue(true);
    }
  }

  markOptionCorrect(questionIndex: number, optionIndex: number): void {
    this.answerOptions(questionIndex).controls.forEach((control, index) => {
      control.get('is_correct')?.setValue(index === optionIndex);
    });
  }

  onQuestionTypeChange(questionIndex: number): void {
    const questionForm = this.questionForms.at(questionIndex) as UntypedFormGroup;
    const questionType = questionForm.get('question_type')?.value as QuestionType;
    const options = this.answerOptions(questionIndex);

    if (questionType === 'short_answer') {
      options.clear();
      return;
    }

    if (questionType === 'true_false') {
      options.clear();
      this.defaultTrueFalseOptions().forEach((option) => {
        options.push(this.createOptionForm(option));
      });
      return;
    }

    if (options.length < 2) {
      options.clear();
      this.defaultMultipleChoiceOptions().forEach((option) => {
        options.push(this.createOptionForm(option));
      });
    }
  }

  trackByQuizId(_index: number, quiz: TeacherQuiz): number {
    return quiz.id;
  }

  trackByQuestionIndex(index: number): number {
    return index;
  }

  trackByResultId(_index: number, result: QuizResultRow): number {
    return result.id;
  }

  questionTypeLabel(type: QuestionType): string {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple choice';
      case 'true_false':
        return 'True / False';
      default:
        return 'Short answer';
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }
  private validateBuilder(): boolean {
    this.quizForm.markAllAsTouched();

    if (this.quizForm.invalid) {
      this.builderError = 'Please fill in the quiz title before saving.';
      return false;
    }

    if (this.questionForms.length === 0) {
      this.builderError = 'Add at least one question to save a quiz.';
      return false;
    }

    const invalidQuestion = this.questionForms.controls.find((control) => {
      const questionType = control.get('question_type')?.value as QuestionType;
      const questionText = String(control.get('text')?.value ?? '').trim();
      const points = Number(control.get('points')?.value ?? 0);
      const correctTextAnswer = String(control.get('correct_text_answer')?.value ?? '').trim();
      const options = (control.get('answer_options') as FormArray).getRawValue() as Array<{
        text: string;
        is_correct: boolean;
      }>;

      if (!questionText || points < 1) {
        return true;
      }

      if (questionType === 'short_answer') {
        return !correctTextAnswer;
      }

      const validOptions = options.filter((option) => option.text.trim().length > 0);
      const correctOptions = validOptions.filter((option) => option.is_correct);
      return validOptions.length < 2 || correctOptions.length !== 1;
    });

    if (invalidQuestion) {
      this.builderError = 'Each question needs text, points, and one valid answer setup.';
      return false;
    }

    return true;
  }

  private buildPayload(): TeacherQuizPayload {
    const rawValue = this.quizForm.getRawValue() as {
      title: string;
      description: string;
      questions: Array<{
        text: string;
        question_type: QuestionType;
        points: number;
        correct_text_answer: string;
        answer_options: Array<{ text: string; is_correct: boolean }>;
      }>;
    };

    return {
      title: rawValue.title.trim(),
      description: rawValue.description.trim(),
      questions: rawValue.questions.map((question) => ({
        text: question.text.trim(),
        question_type: question.question_type,
        points: Number(question.points),
        correct_text_answer:
          question.question_type === 'short_answer' ? question.correct_text_answer.trim() : '',
        answer_options:
          question.question_type === 'short_answer'
            ? []
            : question.answer_options
                .map((option) => ({
                  text: option.text.trim(),
                  is_correct: option.is_correct,
                }))
                .filter((option) => option.text.length > 0),
      })),
    };
  }

  private createQuestionForm(question?: QuizQuestion): UntypedFormGroup {
    const questionType = question?.question_type ?? 'multiple_choice';
    const options = questionType === 'short_answer'
      ? []
      : question?.answer_options?.length
        ? question.answer_options
        : questionType === 'true_false'
          ? this.defaultTrueFalseOptions()
          : this.defaultMultipleChoiceOptions();

    return this.formBuilder.group({
      text: [question?.text ?? '', Validators.required],
      question_type: [questionType, Validators.required],
      points: [question?.points ?? 1, [Validators.required, Validators.min(1)]],
      correct_text_answer: [question?.correct_text_answer ?? ''],
      answer_options: this.formBuilder.array(options.map((option) => this.createOptionForm(option))),
    });
  }

  private createOptionForm(option?: { text: string; is_correct: boolean }): UntypedFormGroup {
    return this.formBuilder.group({
      text: [option?.text ?? '', Validators.required],
      is_correct: [option?.is_correct ?? false],
    });
  }

  private defaultMultipleChoiceOptions(): Array<{ text: string; is_correct: boolean }> {
    return [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
    ];
  }

  private defaultTrueFalseOptions(): Array<{ text: string; is_correct: boolean }> {
    return [
      { text: 'True', is_correct: true },
      { text: 'False', is_correct: false },
    ];
  }

  private extractApiError(error: unknown, fallbackMessage: string): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error !== null
    ) {
      const errorEntries = Object.entries(error.error as Record<string, unknown>);
      if (errorEntries.length > 0) {
        const [field, value] = errorEntries[0];
        if (Array.isArray(value) && value.length > 0) {
          return `${field}: ${String(value[0])}`;
        }
        if (typeof value === 'string') {
          return value;
        }
      }
    }

    return fallbackMessage;
  }
}
