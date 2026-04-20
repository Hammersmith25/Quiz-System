from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AnswerOption, Attempt, Grade, Question, Quiz, StudentAnswer, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'password',
            'role',
            'department',
            'group_name',
            'student_identifier',
        )

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
        }
        return data


class AnswerOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = AnswerOption
        fields = ('id', 'text', 'is_correct')


class StudentAnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ('id', 'text')


class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    answer_options = AnswerOptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ('id', 'text', 'question_type', 'points', 'correct_text_answer', 'answer_options')

    def validate(self, attrs):
        question_type = attrs.get('question_type', getattr(self.instance, 'question_type', None))
        answer_options = attrs.get('answer_options')
        correct_text_answer = attrs.get('correct_text_answer', getattr(self.instance, 'correct_text_answer', ''))
        points = attrs.get('points', getattr(self.instance, 'points', 1))

        if points < 1:
            raise serializers.ValidationError('Question points must be at least 1.')

        if question_type == Question.QuestionTypes.SHORT_ANSWER:
            if not correct_text_answer:
                raise serializers.ValidationError('Short answer questions require correct_text_answer.')
            if answer_options:
                raise serializers.ValidationError('Short answer questions must not include answer_options.')
        else:
            if answer_options is None and self.instance is None:
                raise serializers.ValidationError('Choice-based questions require answer_options.')
            if not answer_options:
                raise serializers.ValidationError('Choice-based questions require at least one answer option.')

            correct_options = [option for option in answer_options if option.get('is_correct')]
            if question_type == Question.QuestionTypes.MULTIPLE_CHOICE:
                if len(answer_options) < 2:
                    raise serializers.ValidationError('Multiple choice questions require at least two answer options.')
                if not correct_options:
                    raise serializers.ValidationError('Multiple choice questions require at least one correct option.')

            if question_type == Question.QuestionTypes.TRUE_FALSE:
                if len(answer_options) != 2:
                    raise serializers.ValidationError('True/false questions require exactly two answer options.')
                normalized_options = sorted(option.get('text', '').strip().lower() for option in answer_options)
                if normalized_options != ['false', 'true']:
                    raise serializers.ValidationError("True/false options must be 'True' and 'False'.")
                if len(correct_options) != 1:
                    raise serializers.ValidationError('True/false questions must have exactly one correct option.')
        return attrs


class StudentQuestionSerializer(serializers.ModelSerializer):
    answer_options = StudentAnswerOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'text', 'question_type', 'points', 'answer_options')


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Quiz
        fields = (
            'id',
            'title',
            'description',
            'duration',
            'max_score',
            'created_by',
            'is_published',
            'created_at',
            'updated_at',
            'questions',
        )
        read_only_fields = ('is_published', 'created_at', 'updated_at')

    def validate_questions(self, value):
        if not value:
            raise serializers.ValidationError('A quiz must contain at least one question.')
        return value

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        self._upsert_questions(quiz, questions_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            instance.questions.all().delete()
            self._upsert_questions(instance, questions_data)
        return instance

    def _upsert_questions(self, quiz, questions_data):
        total_points = 0
        for question_data in questions_data:
            answer_options_data = question_data.pop('answer_options', [])
            question = Question.objects.create(quiz=quiz, **question_data)
            total_points += question.points
            for option_data in answer_options_data:
                AnswerOption.objects.create(question=question, **option_data)
        quiz.max_score = total_points
        quiz.save(update_fields=['max_score'])


class StudentQuizSerializer(serializers.ModelSerializer):
    questions = StudentQuestionSerializer(many=True, read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Quiz
        fields = (
            'id',
            'title',
            'description',
            'duration',
            'max_score',
            'created_by',
            'is_published',
            'created_at',
            'updated_at',
            'questions',
        )


class StudentAnswerInputSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    selected_option = serializers.IntegerField(required=False)
    text_answer = serializers.CharField(required=False, allow_blank=True)


class SubmitAttemptSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    answers = StudentAnswerInputSerializer(many=True)


class StudentAnswerResultSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    selected_option_text = serializers.CharField(source='selected_option.text', read_only=True)

    class Meta:
        model = StudentAnswer
        fields = ('question', 'question_text', 'selected_option', 'selected_option_text', 'text_answer', 'is_correct')


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ('percentage', 'letter_grade', 'graded_at')


class AttemptSerializer(serializers.ModelSerializer):
    answers = StudentAnswerResultSerializer(many=True, read_only=True)
    grade = GradeSerializer(read_only=True)

    class Meta:
        model = Attempt
        fields = (
            'id',
            'quiz',
            'student',
            'started_at',
            'submitted_at',
            'status',
            'score',
            'max_score',
            'percentage',
            'grade',
            'answers',
        )
        read_only_fields = fields


class TeacherResultSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    letter_grade = serializers.CharField(source='grade.letter_grade', read_only=True)

    class Meta:
        model = Attempt
        fields = (
            'id',
            'student_id',
            'student_username',
            'status',
            'score',
            'max_score',
            'percentage',
            'letter_grade',
            'started_at',
            'submitted_at',
        )


class StudentHistorySerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    letter_grade = serializers.CharField(source='grade.letter_grade', read_only=True)

    class Meta:
        model = Attempt
        fields = (
            'id',
            'quiz',
            'quiz_title',
            'status',
            'started_at',
            'submitted_at',
            'score',
            'max_score',
            'percentage',
            'letter_grade',
        )


class StartAttemptSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()


class StudentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'student_identifier', 'group_name')
