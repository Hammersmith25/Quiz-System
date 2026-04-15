from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Attempt, Quiz, User
from .permissions import IsStudent, IsTeacher
from .serializers import (
    AttemptSerializer,
    CustomTokenObtainPairSerializer,
    QuizSerializer,
    RegisterSerializer,
    SubmitAttemptSerializer,
    TeacherResultSerializer,
)
from .services import grade_quiz_submission


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

    def get_permissions(self):
        if self.action in {'create', 'update', 'partial_update', 'destroy', 'publish', 'unpublish', 'results'}:
            return [IsAuthenticated(), IsTeacher()]
        if self.action == 'submit':
            return [IsAuthenticated(), IsStudent()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        quiz = self.get_object()
        quiz.is_published = True
        quiz.save(update_fields=['is_published'])
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        quiz = self.get_object()
        quiz.is_published = False
        quiz.save(update_fields=['is_published'])
        return Response({'status': 'unpublished'})

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = Quiz.objects.prefetch_related('questions__answer_options').get(pk=pk, is_published=True)
        serializer = SubmitAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = grade_quiz_submission(
            quiz=quiz,
            student=request.user,
            answers_payload=serializer.validated_data['answers'],
        )
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        quiz = self.get_object()
        attempts = Attempt.objects.filter(quiz=quiz).select_related('student', 'grade')
        serializer = TeacherResultSerializer(attempts, many=True)
        return Response(serializer.data)
