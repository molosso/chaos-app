import random
import secrets
import string
from django.conf import settings
from django.db import models
from django.db.models import Q

from content.models import Atelier


def make_join_code():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


class Classroom(models.Model):
    """Une classe gérée par un enseignant : sert de conteneur au tirage au sort et au mur."""

    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="classrooms")
    name = models.CharField(max_length=255)
    join_code = models.CharField(max_length=8, unique=True, default=make_join_code, editable=False)
    allowed_workshops = models.ManyToManyField("content.Workshop", blank=True, related_name="classrooms")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.teacher.username})"


class Student(models.Model):
    """
    Un élève dans une classe. Le compte utilisateur est optionnel : la plupart
    des élèves participent seulement avec un prénom, sans rien créer.
    """

    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="students")
    name = models.CharField(max_length=150)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="student_profile"
    )
    already_drawn = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(
            fields=["classroom", "user"], condition=Q(user__isnull=False), name="unique_classroom_user_profile"
        )]

    def __str__(self):
        return self.name

    @classmethod
    def draw_next(cls, classroom):
        """Tire au sort un élève qui n'est pas encore passé ce tour-ci."""
        remaining = list(cls.objects.filter(classroom=classroom, already_drawn=False))
        if not remaining:
            return None
        chosen = random.choice(remaining)
        chosen.already_drawn = True
        chosen.save(update_fields=["already_drawn"])
        return chosen


class Submission(models.Model):
    """Une production déposée par un élève pour un atelier donné (mur de classe)."""

    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submissions",
    )
    student_name = models.CharField(max_length=150)
    atelier = models.CharField(max_length=20, choices=Atelier.choices)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student_name} - {self.get_atelier_display()}"
