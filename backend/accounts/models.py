from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class ChaosUserManager(UserManager):
    """
    Même comportement que le manager Django standard, sauf que
    createsuperuser force le rôle 'admin' : un superutilisateur Django
    doit aussi être administrateur côté application, sans étape manuelle.
    """

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", "admin")
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """
    Utilisateur unique pour les trois rôles de l'application.
    Email volontairement optionnel : les élèves n'en fournissent jamais un,
    ce qui évite de collecter une donnée personnelle non nécessaire.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur"
        TEACHER = "teacher", "Enseignant"
        STUDENT = "student", "Élève"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    email = models.EmailField(blank=True, null=True)
    # Établissement auquel le compte est rattaché (utile si l'app est vendue à plusieurs clients).
    institution = models.CharField(max_length=255, blank=True)

    objects = ChaosUserManager()

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT


class ActivityLog(models.Model):
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs")
    action = models.CharField(max_length=80)
    target = models.CharField(max_length=180, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action}: {self.target}"
