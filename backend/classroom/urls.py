from rest_framework.routers import DefaultRouter

from .views import ClassroomViewSet, SubmissionViewSet

router = DefaultRouter()
router.register("classrooms", ClassroomViewSet, basename="classroom")
router.register("submissions", SubmissionViewSet, basename="submission")

urlpatterns = router.urls
