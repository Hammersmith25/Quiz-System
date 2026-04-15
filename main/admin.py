from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AnswerOption, Attempt, Grade, Question, Quiz, StudentAnswer, User


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 0


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + ((None, {'fields': ('role',)}),)
    add_fieldsets = UserAdmin.add_fieldsets + ((None, {'fields': ('role',)}),)
    list_display = ('username', 'email', 'role', 'is_staff')


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'is_published', 'created_at')
    list_filter = ('is_published', 'created_at')
    search_fields = ('title', 'description', 'created_by__username')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz', 'question_type', 'points')
    list_filter = ('question_type',)
    inlines = [AnswerOptionInline]


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'student', 'score', 'max_score', 'percentage', 'submitted_at')
    list_filter = ('submitted_at',)


admin.site.register(AnswerOption)
admin.site.register(StudentAnswer)
admin.site.register(Grade)
