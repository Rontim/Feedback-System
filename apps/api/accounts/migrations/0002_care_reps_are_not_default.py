from django.db import migrations, models


def demote_superusers(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.using(schema_editor.connection.alias).filter(is_superuser=True).update(
        is_care_rep=False
    )


def restore_superuser_reps(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.using(schema_editor.connection.alias).filter(is_superuser=True).update(
        is_care_rep=True
    )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="is_care_rep",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(demote_superusers, restore_superuser_reps),
    ]
