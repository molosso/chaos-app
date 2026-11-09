from django.conf import settings
from django.db import migrations, models


def copy_workshop_teachers(apps, schema_editor):
    Workshop = apps.get_model("content", "Workshop")
    for workshop in Workshop.objects.exclude(teacher__isnull=True).iterator():
        workshop.teachers.add(workshop.teacher_id)


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0002_workshop_workshopenrollment_workshopresource_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="workshop",
            name="teachers",
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={"role": "teacher"},
                related_name="legacy_workshop_assignments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(copy_workshop_teachers, migrations.RunPython.noop),
        migrations.RemoveField(model_name="workshop", name="teacher"),
        migrations.AlterField(
            model_name="workshop",
            name="teachers",
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={"role": "teacher"},
                related_name="workshops",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="workshop",
            name="atelier",
            field=models.CharField(
                choices=[
                    ("eloquence", "Studio d'éloquence"),
                    ("histoires", "Générateur d'histoires"),
                    ("memes", "Générateur de mèmes"),
                    ("fake_news", "Fake News Academy"),
                    ("image_histoire", "Image vers Histoire"),
                    ("improvisation", "Improvisation"),
                ],
                max_length=20,
            ),
        ),
    ]
