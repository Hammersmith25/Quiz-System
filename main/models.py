from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Roles(models.TextChoices):
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'

    role = models.CharField(max_length=20, choices=Roles.choices)
    department = models.CharField(max_length=120, blank=True)
    group_name = models.CharField(max_length=120, blank=True)
    student_identifier = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f'{self.username} ({self.role})'


class Quiz(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration = models.PositiveIntegerField(default=30)
    max_score = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Question(models.Model):
    class QuestionTypes(models.TextChoices):
        MULTIPLE_CHOICE = 'multiple_choice', 'Multiple Choice'
        TRUE_FALSE = 'true_false', 'True/False'
        SHORT_ANSWER = 'short_answer', 'Short Answer'

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500)
    question_type = models.CharField(max_length=30, choices=QuestionTypes.choices)
    points = models.PositiveIntegerField(default=1)
    correct_text_answer = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.text


class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answer_options')
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):
    class AttemptStatus(models.TextChoices):
        STARTED = 'started', 'Started'
        SUBMITTED = 'submitted', 'Submitted'
        GRADED = 'graded', 'Graded'

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    started_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=AttemptStatus.choices, default=AttemptStatus.STARTED)
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.student.username} - {self.quiz.title}'


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_answers')
    selected_option = models.ForeignKey(
        AnswerOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='selected_answers',
    )
    text_answer = models.CharField(max_length=255, blank=True)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.attempt_id} - {self.question_id}'


class Grade(models.Model):
    class LetterGrades(models.TextChoices):
        A = 'A', 'A'
        B = 'B', 'B'
        C = 'C', 'C'
        D = 'D', 'D'
        F = 'F', 'F'

    attempt = models.OneToOneField(Attempt, on_delete=models.CASCADE, related_name='grade')
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    letter_grade = models.CharField(max_length=2, choices=LetterGrades.choices)
    graded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.attempt} - {self.letter_grade}'
