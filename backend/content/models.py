import random
from django.conf import settings
from django.db import models


class Atelier(models.TextChoices):
    ELOQUENCE = "eloquence", "Studio d'éloquence"
    HISTOIRES = "histoires", "Générateur d'histoires"
    MEMES = "memes", "Générateur de mèmes"
    FAKE_NEWS = "fake_news", "Fake News Academy"
    IMAGE_HISTOIRE = "image_histoire", "Image vers Histoire"
    IMPROVISATION = "improvisation", "Improvisation"


class Category(models.TextChoices):
    TOPIC = "topic", "Sujet"
    WORD = "word", "Mot imposé"
    CHARACTER = "character", "Personnage"
    PLACE = "place", "Lieu"
    OBJECT = "object", "Objet"
    GRAMMAR = "grammar", "Contrainte de grammaire"
    BAN = "ban", "Mot interdit"
    SITUATION = "situation", "Situation"
    PROMPT = "prompt", "Consigne"


class ContentItem(models.Model):
    """
    Une entrée d'une banque de contenu. Modifiable directement depuis
    Django Admin par l'administrateur de l'établissement, sans toucher au code.
    """

    atelier = models.CharField(max_length=20, choices=Atelier.choices)
    category = models.CharField(max_length=20, choices=Category.choices)
    text = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["atelier", "category", "is_active"])]

    def __str__(self):
        return f"[{self.get_atelier_display()} / {self.get_category_display()}] {self.text[:50]}"

    @classmethod
    def random_for(cls, atelier, category, count=1):
        qs = list(cls.objects.filter(atelier=atelier, category=category, is_active=True))
        if not qs:
            return []
        return random.sample(qs, k=min(count, len(qs)))


class ImprovScene(models.Model):
    """Scène d'improvisation : personnage, situation et objectif liés entre eux."""

    character = models.CharField(max_length=255)
    situation = models.CharField(max_length=255)
    goal = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.character}, {self.situation}"

    @classmethod
    def random_one(cls):
        qs = list(cls.objects.filter(is_active=True))
        return random.choice(qs) if qs else None


class Workshop(models.Model):
    """Atelier publiable et administrable, distinct des entrées de contenu."""

    atelier = models.CharField(max_length=20, choices=Atelier.choices)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    cover_image_url = models.URLField(blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    teachers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="workshops",
        limit_choices_to={"role": "teacher"},
    )
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]
        indexes = [models.Index(fields=["is_active", "is_archived"])]

    def __str__(self):
        return self.title

    @property
    def enrollment_count(self):
        return self.enrollments.filter(is_active=True).count()


class WorkshopEnrollment(models.Model):
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workshop_enrollments",
        limit_choices_to={"role": "student"},
    )
    is_active = models.BooleanField(default=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-enrolled_at"]
        constraints = [models.UniqueConstraint(fields=["workshop", "student"], name="unique_workshop_enrollment")]

    def __str__(self):
        return f"{self.student} - {self.workshop}"


class WorkshopResource(models.Model):
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    url = models.URLField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
