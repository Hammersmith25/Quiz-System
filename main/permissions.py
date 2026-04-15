from rest_framework.permissions import BasePermission

from .models import User


class IsTeacher(BasePermission):
    message = 'Only teachers can perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Roles.TEACHER)


class IsStudent(BasePermission):
    message = 'Only students can perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Roles.STUDENT)
