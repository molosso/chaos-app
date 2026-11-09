from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EnrollmentViewSet,
    RandomContentView,
    RandomImprovSceneView,
    WorkshopResourceViewSet,
    WorkshopViewSet,
)

router = DefaultRouter()
router.register("workshops", WorkshopViewSet, basename="workshop")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")
router.register("resources", WorkshopResourceViewSet, basename="workshop-resource")

urlpatterns = [
    path("random/", RandomContentView.as_view(), name="content-random"),
    path("improv/random/", RandomImprovSceneView.as_view(), name="improv-random"),
] + router.urls
