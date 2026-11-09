from rest_framework import serializers
from content.models import Workshop

from .models import Classroom, Student, Submission


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["id", "name", "already_drawn", "created_at"]
        read_only_fields = ["already_drawn"]


class ClassroomSerializer(serializers.ModelSerializer):
    students = StudentSerializer(many=True, read_only=True)
    teacher_username = serializers.CharField(source="teacher.username", read_only=True)
    allowed_workshops = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Workshop.objects.all(), required=False
    )

    class Meta:
        model = Classroom
        fields = ["id", "name", "join_code", "allowed_workshops", "created_at", "teacher_username", "students"]
        read_only_fields = ["teacher", "join_code"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_student:
            fields.pop("students")
            fields["allowed_workshops"].read_only = True
        return fields

    def validate_allowed_workshops(self, workshops):
        user = self.context["request"].user
        if user.is_teacher and any(not workshop.teachers.filter(pk=user.pk).exists() for workshop in workshops):
            raise serializers.ValidationError("Vous ne pouvez associer que vos ateliers à cette classe.")
        return workshops


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ["id", "classroom", "student", "student_name", "atelier", "text", "created_at"]
        read_only_fields = ["student", "student_name", "created_at"]

    def validate(self, attrs):
        user = self.context["request"].user
        classroom = attrs.get("classroom")
        atelier = attrs.get("atelier")
        if not user.is_student:
            raise serializers.ValidationError("Seuls les élèves peuvent déposer une production.")
        student = classroom.students.filter(user=user).first()
        if not student:
            raise serializers.ValidationError({"classroom": "Votre compte élève n'est pas inscrit dans cette classe."})
        if not classroom.allowed_workshops.filter(atelier=atelier).exists():
            raise serializers.ValidationError({"atelier": "Cet atelier n'est pas autorisé dans cette classe."})
        if not user.workshop_enrollments.filter(
            workshop__atelier=atelier, workshop__is_active=True, workshop__is_archived=False, is_active=True
        ).exists():
            raise serializers.ValidationError({"atelier": "Vous n'êtes pas inscrit à cet atelier."})
        self._student_profile = student
        return attrs

    def create(self, validated_data):
        validated_data["student"] = self.context["request"].user
        validated_data["student_name"] = self._student_profile.name
        return super().create(validated_data)
