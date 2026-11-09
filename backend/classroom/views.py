from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsTeacher
from accounts.models import ActivityLog
from .models import Classroom, Student, Submission
from .serializers import ClassroomSerializer, StudentSerializer, SubmissionSerializer


class ClassroomViewSet(viewsets.ModelViewSet):
    """
    Un enseignant ne voit et ne gère que ses propres classes.
    Un administrateur voit celles de tout l'établissement.
    """
    serializer_class = ClassroomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in {"list", "retrieve", "join"}:
            return [permissions.IsAuthenticated()]
        return [IsTeacher()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            return Classroom.objects.all()
        if user.is_teacher:
            return Classroom.objects.filter(teacher=user)
        if user.is_student:
            return Classroom.objects.filter(students__user=user).distinct()
        return Classroom.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_teacher:
            self.permission_denied(self.request, message="Seul un enseignant peut créer une classe.")
        classroom = serializer.save(teacher=self.request.user)
        ActivityLog.objects.create(actor=self.request.user, action="classroom.created", target=classroom.name)

    def perform_update(self, serializer):
        classroom = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="classroom.updated", target=classroom.name)

    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request):
        if not request.user.is_student:
            self.permission_denied(request, message="Seul un élève peut rejoindre une classe.")
        code = str(request.data.get("code", "")).strip().upper()
        if len(code) != 8:
            raise ValidationError({"code": "Saisissez le code de classe à 8 caractères."})
        with transaction.atomic():
            classroom = Classroom.objects.select_for_update().filter(join_code=code).first()
            if classroom is None:
                raise ValidationError({"code": "Ce code de classe est inconnu."})
            profile = classroom.students.filter(user=request.user).first()
            if profile is None:
                profile = classroom.students.filter(user__isnull=True, name__iexact=request.user.first_name or request.user.username).first()
                if profile:
                    profile.user = request.user
                    profile.save(update_fields=["user"])
                else:
                    profile = Student.objects.create(
                        classroom=classroom, user=request.user,
                        name=request.user.first_name.strip() or request.user.username,
                    )
                ActivityLog.objects.create(actor=request.user, action="classroom.student_joined", target=classroom.name)
        return Response(self.get_serializer(classroom).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="students")
    def add_students(self, request, pk=None):
        """Ajoute une liste de prénoms d'un coup : {"names": ["Amine", "Lina"]}."""
        classroom = self.get_object()
        names = request.data.get("names", [])
        if not isinstance(names, list) or len(names) > 100:
            raise ValidationError({"names": "Envoyez une liste de 100 prénoms maximum."})
        normalized = []
        for name in names:
            if not isinstance(name, str):
                raise ValidationError({"names": "Chaque prénom doit être du texte."})
            clean_name = name.strip()
            if clean_name and len(clean_name) > 150:
                raise ValidationError({"names": "Un prénom ne peut dépasser 150 caractères."})
            if clean_name:
                normalized.append(clean_name)
        created = [Student.objects.create(classroom=classroom, name=name) for name in normalized]
        ActivityLog.objects.create(actor=request.user, action="classroom.students_added", target=classroom.name, metadata={"count": len(created)})
        return Response(StudentSerializer(created, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="draw")
    def draw(self, request, pk=None):
        """Tire au sort le prochain élève qui n'est pas encore passé."""
        classroom = self.get_object()
        student = Student.draw_next(classroom)
        if student is None:
            return Response({"detail": "Tout le monde est passé pour ce tour."}, status=status.HTTP_404_NOT_FOUND)
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=["post"], url_path="reset-round")
    def reset_round(self, request, pk=None):
        """Remet tous les élèves dans le pot pour un nouveau tour."""
        classroom = self.get_object()
        classroom.students.update(already_drawn=False)
        ActivityLog.objects.create(actor=request.user, action="classroom.round_reset", target=classroom.name)
        return Response(StudentSerializer(classroom.students.all(), many=True).data)


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    Les étudiants ne voient que leurs productions; enseignants leurs classes;
    l'administrateur peut consulter l'ensemble de l'établissement.
    """
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Submission.objects.select_related("classroom", "student")
        user = self.request.user
        if user.is_student:
            qs = qs.filter(student=user)
        elif user.is_teacher:
            qs = qs.filter(classroom__teacher=user)
        elif not user.is_admin_role:
            return qs.none()
        classroom_id = self.request.query_params.get("classroom")
        if classroom_id:
            qs = qs.filter(classroom_id=classroom_id)
        return qs

    def perform_create(self, serializer):
        submission = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="submission.created", target=submission.get_atelier_display())
