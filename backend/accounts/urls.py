from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import (
    AdminStatsView,
    AdminActivityView,
    AdminUserViewSet,
    ChaosTokenObtainPairView,
    MeView,
    ChangePasswordView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    StudentSelfRegisterView,
    TeacherCreateView,
)

router = DefaultRouter()
router.register("admin/users", AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("login/", ChaosTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("me/password/", ChangePasswordView.as_view(), name="change-password"),
    path("teachers/", TeacherCreateView.as_view(), name="teacher-create"),
    path("students/register/", StudentSelfRegisterView.as_view(), name="student-register"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/activity/", AdminActivityView.as_view(), name="admin-activity"),
] + router.urls
