from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Attempt, Quiz, User
from .permissions import IsStudent, IsTeacher
from .serializers import (
    AttemptSerializer,
    CustomTokenObtainPairSerializer,
    QuizSerializer,
    RegisterSerializer,
    StartAttemptSerializer,
    StudentHistorySerializer,
    StudentListSerializer,
    StudentQuizSerializer,
    SubmitAttemptSerializer,
    TeacherResultSerializer,
)
from .services import grade_quiz_submission, start_quiz_attempt


class RegisterView(mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_205_RESET_CONTENT)


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Quiz.objects.prefetch_related('questions__answer_options').select_related('created_by')

        if not user.is_authenticated:
            return Quiz.objects.none()
        if user.role == User.Roles.TEACHER:
            return queryset.filter(created_by=user)
        return queryset.filter(is_published=True)

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == User.Roles.STUDENT:
            return StudentQuizSerializer
        return QuizSerializer

    def get_permissions(self):
        if self.action in {'create', 'update', 'partial_update', 'destroy', 'publish', 'unpublish', 'results'}:
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        quiz = self.get_object()
        if not quiz.questions.exists():
            return Response(
                {'detail': 'Quiz must contain at least one question before publishing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quiz.is_published = True
        quiz.save(update_fields=['is_published'])
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        quiz = self.get_object()
        quiz.is_published = False
        quiz.save(update_fields=['is_published'])
        return Response({'status': 'unpublished'})

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        quiz = self.get_object()
        attempts = Attempt.objects.filter(quiz=quiz).select_related('student', 'grade')
        serializer = TeacherResultSerializer(attempts, many=True)
        return Response(serializer.data)


class StartAttemptView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = get_object_or_404(
            Quiz.objects.prefetch_related('questions__answer_options'),
            pk=serializer.validated_data['quiz_id'],
            is_published=True,
        )
        attempt = start_quiz_attempt(quiz=quiz, student=request.user)
        quiz_data = StudentQuizSerializer(quiz).data
        return Response(
            {
                'attempt': AttemptSerializer(attempt).data,
                'quiz': quiz_data,
            },
            status=status.HTTP_201_CREATED,
        )


class SubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = SubmitAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = get_object_or_404(
            Attempt.objects.select_related('quiz', 'student'),
            pk=serializer.validated_data['attempt_id'],
            student=request.user,
        )
        graded_attempt = grade_quiz_submission(
            attempt=attempt,
            answers_payload=serializer.validated_data['answers'],
        )
        return Response(AttemptSerializer(graded_attempt).data, status=status.HTTP_200_OK)


class StudentHistoryView(ListAPIView):
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentHistorySerializer

    def get_queryset(self):
        return Attempt.objects.filter(student=self.request.user).select_related('quiz', 'grade')


class StudentListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    serializer_class = StudentListSerializer

    def get_queryset(self):
        return User.objects.filter(role=User.Roles.STUDENT).order_by('username')
