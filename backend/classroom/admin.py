from django.contrib import admin

from .models import Classroom, Student, Submission
from accounts.models import ActivityLog


class StudentInline(admin.TabularInline):
    model = Student
    extra = 0


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ("name", "teacher", "join_code", "created_at")
    list_filter = ("teacher",)
    search_fields = ("name", "join_code", "teacher__username")
    readonly_fields = ("join_code",)
    filter_horizontal = ("allowed_workshops",)
    inlines = [StudentInline]


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("student_name", "atelier", "classroom", "created_at")
    list_filter = ("atelier", "classroom")
    search_fields = ("student_name", "text")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "target")
    list_filter = ("action", "created_at")
    search_fields = ("actor__username", "action", "target")
    readonly_fields = ("actor", "action", "target", "metadata", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
