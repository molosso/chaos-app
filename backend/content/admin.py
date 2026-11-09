from django.contrib import admin

from .models import ContentItem, ImprovScene, Workshop, WorkshopEnrollment, WorkshopResource


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = ("title", "atelier", "teacher_names", "capacity", "enrolled", "is_active", "is_archived", "updated_at")
    list_filter = ("atelier", "teachers", "is_active", "is_archived")
    search_fields = ("title", "description", "teachers__username")
    filter_horizontal = ("teachers",)
    list_editable = ("capacity", "is_active", "is_archived")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("title",)

    @admin.display(description="Inscrits")
    def enrolled(self, obj):
        return obj.enrollments.filter(is_active=True).count()

    @admin.display(description="Enseignants")
    def teacher_names(self, obj):
        return ", ".join(user.username for user in obj.teachers.all()) or "Non attribué"


@admin.register(WorkshopEnrollment)
class WorkshopEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "workshop", "is_active", "enrolled_at")
    list_filter = ("workshop", "is_active", "enrolled_at")
    search_fields = ("student__username", "student__first_name", "workshop__title")
    readonly_fields = ("enrolled_at",)


@admin.register(WorkshopResource)
class WorkshopResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "workshop", "created_by", "is_published", "created_at")
    list_filter = ("workshop", "is_published", "created_at")
    search_fields = ("title", "description")
    readonly_fields = ("created_at",)


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    """
    C'est ici que l'administrateur ajoute, modifie ou désactive les sujets,
    mots, personnages, situations, etc. de chaque atelier, sans coder.
    """
    list_display = ("atelier", "category", "text_preview", "is_active", "created_at")
    list_filter = ("atelier", "category", "is_active")
    search_fields = ("text",)
    list_editable = ("is_active",)

    def text_preview(self, obj):
        return obj.text[:80]
    text_preview.short_description = "Texte"


@admin.register(ImprovScene)
class ImprovSceneAdmin(admin.ModelAdmin):
    list_display = ("character", "situation", "goal", "is_active")
    list_filter = ("is_active",)
    search_fields = ("character", "situation", "goal")
    list_editable = ("is_active",)
