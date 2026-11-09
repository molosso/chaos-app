import secrets
import string

import django.db.models.deletion
import classroom.models
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


def populate_join_codes(apps, schema_editor):
    Classroom = apps.get_model("classroom", "Classroom")
    alphabet = string.ascii_uppercase + string.digits
    for classroom in Classroom.objects.filter(join_code__isnull=True).iterator():
        while True:
            code = "".join(secrets.choice(alphabet) for _ in range(8))
            if not Classroom.objects.filter(join_code=code).exists():
                classroom.join_code = code
                classroom.save(update_fields=["join_code"])
                break


class Migration(migrations.Migration):
    dependencies = [
        ("classroom", "0002_submission_student"),
        ("content", "0002_workshop_workshopenrollment_workshopresource_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="classroom",
            name="join_code",
            field=models.CharField(blank=True, max_length=8, null=True),
        ),
        migrations.AddField(
            model_name="classroom",
            name="allowed_workshops",
            field=models.ManyToManyField(blank=True, related_name="classrooms", to="content.workshop"),
        ),
        migrations.AlterField(
            model_name="student",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="student_profile",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="student",
            constraint=models.UniqueConstraint(
                condition=Q(user__isnull=False),
                fields=("classroom", "user"),
                name="unique_classroom_user_profile",
            ),
        ),
        migrations.RunPython(populate_join_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="classroom",
            name="join_code",
            field=models.CharField(default=classroom.models.make_join_code, editable=False, max_length=8, unique=True),
        ),
    ]
