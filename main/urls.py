from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    LogoutView,
    QuizViewSet,
    RegisterView,
    StartAttemptView,
    StudentHistoryView,
    StudentListView,
    SubmitAttemptView,
)

router = DefaultRouter()
router.register('quizzes', QuizViewSet, basename='quiz')
router.register('auth/register', RegisterView, basename='register')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='token_logout'),
    path('attempt/start/', StartAttemptView.as_view(), name='attempt_start'),
    path('attempt/submit/', SubmitAttemptView.as_view(), name='attempt_submit'),
    path('students/', StudentListView.as_view(), name='student_list'),
    path('history/', StudentHistoryView.as_view(), name='student_history'),
]
