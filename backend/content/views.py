from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ActivityLog
from accounts.permissions import IsAdminRole
from .models import Atelier, Category, ContentItem, ImprovScene, Workshop, WorkshopEnrollment, WorkshopResource
from .serializers import (
    ContentItemSerializer,
    ImprovSceneSerializer,
    WorkshopEnrollmentSerializer,
    WorkshopResourceSerializer,
    WorkshopSerializer,
)


class RandomContentView(APIView):
    """
    Tire au sort une ou plusieurs entrées de contenu pour un atelier donné.
    L'accès aux banques de contenu suit les ateliers attribués ou rejoints.
    Exemple : GET /api/content/random/?atelier=eloquence&category=topic&count=1
    """
    permission_classes = [permissions.IsAuthenticated]

    def _allowed(self, request, atelier):
        user = request.user
        if user.is_admin_role:
            return True
        workshop = Workshop.objects.filter(atelier=atelier, is_active=True, is_archived=False).first()
        if not workshop:
            return False
        if user.is_teacher:
            return workshop.teachers.filter(pk=user.pk).exists()
        return WorkshopEnrollment.objects.filter(
            workshop=workshop, student=user, is_active=True,
            workshop__classrooms__students__user=user,
        ).exists()

    def get(self, request):
        atelier = request.query_params.get("atelier")
        category = request.query_params.get("category")
        if not atelier or not category:
            return Response({"detail": "Paramètres 'atelier' et 'category' requis."}, status=400)
        try:
            count = int(request.query_params.get("count", 1))
        except (TypeError, ValueError):
            return Response({"detail": "Le paramètre 'count' doit être un entier."}, status=400)
        if atelier not in Atelier.values or category not in Category.values or not 1 <= count <= 10:
            return Response({"detail": "Atelier, catégorie ou nombre d'éléments invalide."}, status=400)
        if not self._allowed(request, atelier):
            return Response({"detail": "Inscrivez-vous à un atelier autorisé pour accéder à son contenu."}, status=403)
        items = ContentItem.random_for(atelier, category, count=count)
        return Response(ContentItemSerializer(items, many=True).data)


class RandomImprovSceneView(APIView):
    """Tire au sort une scène complète (personnage, situation, objectif)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        access = RandomContentView()
        if not access._allowed(request, "improvisation"):
            return Response({"detail": "Cette activité n'est pas autorisée pour votre compte."}, status=403)
        scene = ImprovScene.random_one()
        if not scene:
            return Response({"detail": "Aucune scène disponible."}, status=404)
        return Response(ImprovSceneSerializer(scene).data)


class WorkshopViewSet(viewsets.ModelViewSet):
    serializer_class = WorkshopSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Workshop.objects.prefetch_related("teachers").all()
        user = self.request.user
        if user.is_admin_role:
            return qs
        if user.is_teacher:
            return qs.filter(teachers=user).distinct()
        return qs.filter(
            is_active=True, is_archived=False,
            classrooms__students__user=user,
        ).distinct()

    def get_permissions(self):
        if getattr(self, "action", None) == "enroll":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if user.is_admin_role:
            return
        if user.is_teacher and obj.teachers.filter(pk=user.pk).exists() and request.method in {"GET", "HEAD", "OPTIONS", "PATCH"}:
            return
        if user.is_student and obj.is_active and not obj.is_archived and (
            request.method in {"GET", "HEAD", "OPTIONS"} or self.action == "enroll"
        ):
            return
        self.permission_denied(request, message="Vous n'avez pas accès à cette activité.")

    def perform_create(self, serializer):
        if not self.request.user.is_admin_role:
            self.permission_denied(self.request)
        workshop = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="workshop.created", target=workshop.title)

    def perform_update(self, serializer):
        workshop = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="workshop.updated", target=workshop.title)

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        ActivityLog.objects.create(actor=self.request.user, action="workshop.deleted", target=title)

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        if not request.user.is_student:
            self.permission_denied(request, message="Seul un étudiant peut s'inscrire à une activité.")
        with transaction.atomic():
            workshop = Workshop.objects.select_for_update().get(pk=self.get_object().pk)
            if not workshop.is_active or workshop.is_archived:
                raise ValidationError("Cette activité n'accepte plus d'inscriptions.")
            enrollment = WorkshopEnrollment.objects.filter(workshop=workshop, student=request.user).first()
            if enrollment and enrollment.is_active:
                return Response(WorkshopEnrollmentSerializer(enrollment).data)
            active_count = workshop.enrollments.filter(is_active=True).count()
            if workshop.capacity is not None and active_count >= workshop.capacity:
                raise ValidationError("Cette activité a atteint sa capacité maximale.")
            if enrollment:
                enrollment.is_active = True
                enrollment.save(update_fields=["is_active"])
            else:
                enrollment = WorkshopEnrollment.objects.create(workshop=workshop, student=request.user)
            ActivityLog.objects.create(actor=request.user, action="workshop.enrolled", target=workshop.title)
        return Response(WorkshopEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


class EnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkshopEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = WorkshopEnrollment.objects.select_related("workshop", "student")
        user = self.request.user
        if user.is_admin_role:
            return qs
        if user.is_teacher:
            return qs.filter(workshop__teachers=user)
        return qs.filter(student=user)


class WorkshopResourceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkshopResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = WorkshopResource.objects.select_related("workshop", "created_by")
        user = self.request.user
        if user.is_admin_role:
            return qs
        if user.is_teacher:
            return qs.filter(workshop__teachers=user)
        return qs.filter(is_published=True, workshop__is_active=True, workshop__is_archived=False,
                         workshop__enrollments__student=user, workshop__enrollments__is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_admin_role or user.is_teacher):
            self.permission_denied(self.request)
        resource = serializer.save(created_by=user)
        ActivityLog.objects.create(actor=user, action="resource.published", target=resource.title)

    def perform_update(self, serializer):
        resource = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="resource.updated", target=resource.title)

    def perform_destroy(self, instance):
        if not self.request.user.is_admin_role:
            self.permission_denied(self.request)
        title = instance.title
        instance.delete()
        ActivityLog.objects.create(actor=self.request.user, action="resource.deleted", target=title)
