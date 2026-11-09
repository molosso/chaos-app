from rest_framework import serializers

from .models import ContentItem, ImprovScene, Workshop, WorkshopEnrollment, WorkshopResource


class ContentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentItem
        fields = ["id", "atelier", "category", "text"]


class ImprovSceneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImprovScene
        fields = ["id", "character", "situation", "goal"]


class WorkshopSerializer(serializers.ModelSerializer):
    enrollment_count = serializers.IntegerField(read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Workshop
        fields = ["id", "atelier", "title", "description", "cover_image_url", "capacity", "teachers", "teacher_name", "is_active", "is_archived", "enrollment_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_teacher_name(self, obj):
        names = [teacher.get_full_name() or teacher.username for teacher in obj.teachers.all()]
        return ", ".join(names)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_teacher:
            for name in ("atelier", "teachers", "capacity", "is_active", "is_archived"):
                fields[name].read_only = True
        return fields


class WorkshopEnrollmentSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    workshop_title = serializers.CharField(source="workshop.title", read_only=True)

    class Meta:
        model = WorkshopEnrollment
        fields = ["id", "workshop", "workshop_title", "student", "student_username", "is_active", "enrolled_at"]
        read_only_fields = ["student", "is_active", "enrolled_at"]


class WorkshopResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkshopResource
        fields = ["id", "workshop", "title", "description", "url", "created_by", "is_published", "created_at"]
        read_only_fields = ["created_by", "created_at"]

    def validate_workshop(self, workshop):
        user = self.context["request"].user
        if user.is_teacher and not workshop.teachers.filter(pk=user.pk).exists():
            raise serializers.ValidationError("Cette activité ne vous est pas attribuée.")
        return workshop
