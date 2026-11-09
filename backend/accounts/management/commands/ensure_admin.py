import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Crée le compte administrateur initial à partir des variables d'environnement "
        "ADMIN_USERNAME et ADMIN_PASSWORD. Sans effet si le compte existe déjà : "
        "un mot de passe changé depuis l'interface n'est jamais écrasé au redémarrage."
    )

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "")
        if not username or not password:
            self.stdout.write("ADMIN_USERNAME / ADMIN_PASSWORD non définis : aucun compte créé.")
            return

        user = User.objects.filter(username=username).first()
        if user is not None:
            changed = []
            if user.role != User.Role.ADMIN:
                user.role = User.Role.ADMIN
                changed.append("role")
            if not user.is_active:
                user.is_active = True
                changed.append("is_active")
            if changed:
                user.save(update_fields=changed)
            self.stdout.write(f"Compte '{username}' déjà présent, mot de passe inchangé.")
            return

        try:
            User.objects.create_superuser(username=username, password=password, first_name="Administrateur")
        except Exception as error:
            raise CommandError(f"Impossible de créer le compte administrateur : {error}")
        self.stdout.write(self.style.SUCCESS(f"Compte administrateur '{username}' créé."))

        if password == "admin":
            self.stdout.write(self.style.WARNING(
                "ATTENTION : le mot de passe administrateur est 'admin'. "
                "Changez-le avant d'exposer l'application sur internet."
            ))
