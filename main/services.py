from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Attempt, Grade, Question, Quiz, StudentAnswer


LETTER_GRADE_BANDS = (
    (90, 'A'),
    (80, 'B'),
    (70, 'C'),
    (60, 'D'),
    (0, 'F'),
)


def calculate_letter_grade(percentage):
    numeric_percentage = float(percentage)
    for minimum, letter in LETTER_GRADE_BANDS:
        if numeric_percentage >= minimum:
            return letter
    return 'F'


def _normalize_text(value):
    return (value or '').strip().lower()


@transaction.atomic
def start_quiz_attempt(*, quiz: Quiz, student):
    if not quiz.is_published:
        raise ValidationError('Only published quizzes can be started.')

    return Attempt.objects.create(
        quiz=quiz,
        student=student,
        max_score=quiz.max_score,
        status=Attempt.AttemptStatus.STARTED,
    )


@transaction.atomic
def grade_quiz_submission(*, attempt: Attempt, answers_payload):
    quiz = attempt.quiz
    student = attempt.student

    if not quiz.is_published:
        raise ValidationError('Only published quizzes can be submitted.')
    if attempt.status != Attempt.AttemptStatus.STARTED:
        raise ValidationError('Only started attempts can be submitted.')

    questions = list(quiz.questions.prefetch_related('answer_options').all())
    if not questions:
        raise ValidationError('This quiz does not contain any questions yet.')

    question_ids = [answer['question'] for answer in answers_payload]
    if len(question_ids) != len(set(question_ids)):
        raise ValidationError('Each question can only be answered once per submission.')

    quiz_question_ids = {question.id for question in questions}
    unknown_question_ids = sorted(set(question_ids) - quiz_question_ids)
    if unknown_question_ids:
        raise ValidationError(
            f'Submission contains questions that do not belong to quiz {quiz.id}: {unknown_question_ids}.'
        )

    provided_answers = {answer['question']: answer for answer in answers_payload}
    total_points = sum(question.points for question in questions)
    earned_points = 0

    attempt.max_score = total_points
    attempt.answers.all().delete()

    for question in questions:
        submitted_answer = provided_answers.get(question.id, {})
        selected_option = None
        text_answer = submitted_answer.get('text_answer', '')
        is_correct = False

        if question.question_type == Question.QuestionTypes.SHORT_ANSWER:
            is_correct = _normalize_text(text_answer) == _normalize_text(question.correct_text_answer)
        else:
            selected_option_id = submitted_answer.get('selected_option')
            if selected_option_id:
                selected_option = question.answer_options.filter(id=selected_option_id).first()
            if selected_option is None and selected_option_id is not None:
                raise ValidationError(f'Option {selected_option_id} does not belong to question {question.id}.')
            is_correct = bool(selected_option and selected_option.is_correct)

        if is_correct:
            earned_points += question.points

        StudentAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_option=selected_option,
            text_answer=text_answer,
            is_correct=is_correct,
        )

    percentage = Decimal('0.00')
    if total_points:
        percentage = (Decimal(earned_points) / Decimal(total_points) * Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )

    attempt.score = earned_points
    attempt.percentage = percentage
    attempt.status = Attempt.AttemptStatus.GRADED
    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=['score', 'percentage', 'status', 'submitted_at', 'max_score'])

    Grade.objects.update_or_create(
        attempt=attempt,
        defaults={
            'percentage': percentage,
            'letter_grade': calculate_letter_grade(percentage),
        },
    )

    return attempt
