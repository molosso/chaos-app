from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Autorise uniquement les comptes administrateur."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class IsTeacher(BasePermission):
    """Autorise uniquement les comptes enseignant (ou administrateur)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_teacher or request.user.is_admin_role)
        )


class IsOwnerTeacherOrAdmin(BasePermission):
    """
    Un enseignant ne peut agir que sur ses propres classes.
    Un administrateur a accès à tout l'établissement.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_role:
            return True
        teacher = getattr(obj, "teacher", None) or getattr(getattr(obj, "classroom", None), "teacher", None)
        return teacher == request.user
