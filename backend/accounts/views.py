from django.contrib.auth import get_user_model
import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Count, Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import generics, permissions, status, viewsets
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdminRole
from .models import ActivityLog
from .tokens import revoke_refresh_tokens
from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    ChaosTokenObtainPairSerializer,
    MeSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    StudentAccountCreateSerializer,
    TeacherCreateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class ChaosTokenObtainPairView(TokenObtainPairView):
    """Endpoint de connexion (enseignant, élève avec compte, ou administrateur)."""
    serializer_class = ChaosTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "login"


class MeView(generics.RetrieveUpdateAPIView):
    """Retourne l'identité et le rôle de la personne connectée."""
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["password"])
        request.user.save(update_fields=["password"])
        revoke_refresh_tokens(request.user)
        ActivityLog.objects.create(actor=request.user, action="account.password_changed", target=request.user.username)
        return Response({"detail": "Mot de passe modifié. Reconnectez-vous sur vos autres appareils."})


class TeacherCreateView(generics.CreateAPIView):
    """Création d'un compte enseignant, réservée à l'administrateur."""
    serializer_class = TeacherCreateSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.TEACHER)

    def perform_create(self, serializer):
        teacher = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="account.teacher_created", target=teacher.username)


class StudentSelfRegisterView(generics.CreateAPIView):
    """
    Un élève peut créer lui-même un compte optionnel, sans connexion préalable
    (prénom + mot de passe uniquement, aucune adresse email demandée).
    """
    serializer_class = StudentAccountCreateSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.filter(role=User.Role.STUDENT)
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "registration"

    def perform_create(self, serializer):
        student = serializer.save()
        ActivityLog.objects.create(actor=student, action="account.student_registered", target=student.username)


class AdminUserPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Gestion de tous les comptes (enseignants, élèves, administrateurs)
    par l'administrateur. Filtres : ?role=teacher&q=texte
    """
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    pagination_class = AdminUserPagination
    # PATCH uniquement pour les modifications : un PUT complet pourrait réactiver
    # un compte par oubli du champ is_active.
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = User.objects.annotate(classroom_count=Count("classrooms")).order_by("role", "username")
        role = self.request.query_params.get("role")
        if role in dict(User.Role.choices):
            qs = qs.filter(role=role)
        search = self.request.query_params.get("q", "").strip()
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(first_name__icontains=search))
        return qs

    def update(self, request, *args, **kwargs):
        target = self.get_object()
        if target.pk == request.user.pk:
            new_role = request.data.get("role", target.role)
            still_active = request.data.get("is_active", target.is_active)
            if new_role != User.Role.ADMIN or still_active in (False, "false", "False"):
                return Response(
                    {"detail": "Vous ne pouvez pas retirer vos propres droits d'administrateur."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        response = super().update(request, *args, **kwargs)
        ActivityLog.objects.create(actor=request.user, action="account.updated", target=target.username)
        return response

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        if target.pk == request.user.pk:
            return Response(
                {"detail": "Vous ne pouvez pas supprimer votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username = target.username
        response = super().destroy(request, *args, **kwargs)
        ActivityLog.objects.create(actor=request.user, action="account.deleted", target=username)
        return response

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        revoke_refresh_tokens(user)
        ActivityLog.objects.create(actor=request.user, action="account.password_reset", target=user.username)
        return Response({"detail": "Mot de passe mis à jour."})


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            username=serializer.validated_data["username"], is_active=True
        ).exclude(email__isnull=True).exclude(email="").first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/password-reset.html?uid={uid}&token={token}"
            try:
                send_mail(
                    "Réinitialisation de votre mot de passe Chaos Français",
                    f"Pour définir un nouveau mot de passe, ouvrez ce lien (valable une seule fois) :\n\n{link}\n",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                # Réponse identique pour éviter toute révélation de l'existence d'un compte.
                logger.exception("Échec de livraison d'un email de réinitialisation")
        return Response({"detail": "Si un compte actif avec une adresse e-mail existe, un lien de réinitialisation a été envoyé."})


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user_id = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Le lien est invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"detail": "Le lien est invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        revoke_refresh_tokens(user)
        ActivityLog.objects.create(actor=user, action="account.password_recovered", target=user.username)
        return Response({"detail": "Mot de passe modifié. Vous pouvez vous connecter."})


class AdminStatsView(APIView):
    """Chiffres globaux affichés en haut de l'interface d'administration."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        from classroom.models import Classroom, Student, Submission
        from content.models import Workshop, WorkshopEnrollment

        return Response({
            "teachers": User.objects.filter(role=User.Role.TEACHER).count(),
            "students": User.objects.filter(role=User.Role.STUDENT).count(),
            "admins": User.objects.filter(role=User.Role.ADMIN).count(),
            "inactive": User.objects.filter(is_active=False).count(),
            "classrooms": Classroom.objects.count(),
            "classroom_students": Student.objects.count(),
            "submissions": Submission.objects.count(),
            "workshops": Workshop.objects.count(),
            "enrollments": WorkshopEnrollment.objects.filter(is_active=True).count(),
        })


class AdminActivityView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response([
            {
                "actor": log.actor.username if log.actor else "Système",
                "action": log.action,
                "target": log.target,
                "created_at": log.created_at,
            }
            for log in ActivityLog.objects.select_related("actor")[:30]
        ])
