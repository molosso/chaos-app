from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Chaos Français - Administration"
admin.site.site_title = "Chaos Français"
admin.site.index_title = "Gestion de l'établissement"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/content/", include("content.urls")),
    path("api/", include("classroom.urls")),
]
