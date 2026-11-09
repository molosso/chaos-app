from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class ChaosUserAdmin(UserAdmin):
    """
    Interface admin pour que l'administrateur de l'établissement gère les
    comptes enseignants et voie les comptes élèves, sans toucher au code.
    """
    list_display = ("username", "first_name", "role", "institution", "is_active", "date_joined")
    list_filter = ("role", "institution", "is_active")
    search_fields = ("username", "first_name", "institution")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informations", {"fields": ("first_name", "email", "role", "institution")}),
        ("Statut", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "first_name", "role", "institution", "password1", "password2"),
        }),
    )
