from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()
USERS_URL = "/api/accounts/admin/users/"


class AdminApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("boss", password="secret1", role=User.Role.ADMIN)
        self.teacher = User.objects.create_user("prof", password="secret1", role=User.Role.TEACHER)
        self.student = User.objects.create_user("eleve", password="secret1", role=User.Role.STUDENT)

    def test_anonymous_is_refused(self):
        self.assertEqual(self.client.get(USERS_URL).status_code, 401)

    def test_teacher_and_student_are_forbidden(self):
        for user in (self.teacher, self.student):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(USERS_URL).status_code, 403)
            self.assertEqual(self.client.get("/api/accounts/admin/stats/").status_code, 403)

    def test_admin_lists_all_accounts_and_filters_by_role(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(USERS_URL).json()["count"], 3)
        teachers = self.client.get(USERS_URL, {"role": "teacher"}).json()["results"]
        self.assertEqual([u["username"] for u in teachers], ["prof"])
        found = self.client.get(USERS_URL, {"q": "elev"}).json()["results"]
        self.assertEqual([u["username"] for u in found], ["eleve"])

    def test_password_is_never_returned(self):
        self.client.force_authenticate(self.admin)
        for user in self.client.get(USERS_URL).json()["results"]:
            self.assertNotIn("password", user)

    def test_admin_creates_account_with_working_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(USERS_URL, {"username": "nouveau", "role": "teacher", "password": "T!ger_8-bundle_55"})
        self.assertEqual(response.status_code, 201)
        self.client.force_authenticate(None)
        login = self.client.post("/api/accounts/login/", {"username": "nouveau", "password": "T!ger_8-bundle_55"})
        self.assertEqual(login.status_code, 200)

    def test_creation_requires_a_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(USERS_URL, {"username": "x", "role": "student"})
        self.assertEqual(response.status_code, 400)

    def test_deactivated_account_cannot_log_in(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(f"{USERS_URL}{self.student.pk}/", {"is_active": False})
        self.client.force_authenticate(None)
        login = self.client.post("/api/accounts/login/", {"username": "eleve", "password": "secret1"})
        self.assertEqual(login.status_code, 401)

    def test_reset_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"{USERS_URL}{self.student.pk}/reset-password/", {"password": "neuf1234"})
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(None)
        login = self.client.post("/api/accounts/login/", {"username": "eleve", "password": "neuf1234"})
        self.assertEqual(login.status_code, 200)

    def test_admin_cannot_delete_or_demote_self(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"{USERS_URL}{self.admin.pk}/").status_code, 400)
        self.assertEqual(self.client.patch(f"{USERS_URL}{self.admin.pk}/", {"is_active": False}).status_code, 400)
        self.assertEqual(self.client.patch(f"{USERS_URL}{self.admin.pk}/", {"role": "teacher"}).status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
        self.assertEqual(self.admin.role, User.Role.ADMIN)

    def test_admin_role_gets_staff_flag_so_django_admin_opens(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(USERS_URL, {"username": "adj", "role": "admin", "password": "T!ger_8-bundle_55"})
        self.assertTrue(User.objects.get(username="adj").is_staff)
        self.assertEqual(response.status_code, 201)

    def test_form_encoded_creation_does_not_create_inactive_account(self):
        self.client.force_authenticate(self.admin)
        self.client.post(USERS_URL, {"username": "form", "role": "student", "password": "T!ger_8-bundle_55"})
        self.assertTrue(User.objects.get(username="form").is_active)

    def test_put_is_not_allowed(self):
        self.client.force_authenticate(self.admin)
        response = self.client.put(f"{USERS_URL}{self.student.pk}/", {"username": "eleve", "role": "student"})
        self.assertEqual(response.status_code, 405)


class EnsureAdminCommandTests(APITestCase):
    def run_command(self, username="admin", password="admin"):
        import os
        from django.core.management import call_command

        os.environ["ADMIN_USERNAME"] = username
        os.environ["ADMIN_PASSWORD"] = password
        try:
            call_command("ensure_admin", verbosity=0)
        finally:
            os.environ.pop("ADMIN_USERNAME", None)
            os.environ.pop("ADMIN_PASSWORD", None)

    def test_creates_admin_who_can_log_in_and_use_admin_api(self):
        self.run_command()
        user = User.objects.get(username="admin")
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff and user.is_superuser)
        login = self.client.post("/api/accounts/login/", {"username": "admin", "password": "admin"})
        self.assertEqual(login.status_code, 200)
        token = login.json()["access"]
        response = self.client.get(USERS_URL, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 200)

    def test_is_idempotent_and_never_overwrites_a_changed_password(self):
        self.run_command()
        user = User.objects.get(username="admin")
        user.set_password("nouveau-mdp")
        user.save()
        self.run_command()
        self.assertEqual(User.objects.filter(username="admin").count(), 1)
        self.assertTrue(User.objects.get(username="admin").check_password("nouveau-mdp"))

    def test_does_nothing_without_variables(self):
        from django.core.management import call_command

        call_command("ensure_admin", verbosity=0)
        self.assertFalse(User.objects.filter(role=User.Role.ADMIN).exists())


class SeedContentIfEmptyTests(APITestCase):
    def test_if_empty_does_not_recreate_deleted_content(self):
        from django.core.management import call_command
        from content.models import ContentItem

        call_command("seed_content", verbosity=0)
        total = ContentItem.objects.count()
        ContentItem.objects.first().delete()
        call_command("seed_content", "--if-empty", verbosity=0)
        self.assertEqual(ContentItem.objects.count(), total - 1)
