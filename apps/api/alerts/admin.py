from django.contrib import admin

from .models import Alert, Notification


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("id", "response", "email_status", "email_attempts", "read_at", "handled_by")
    list_filter = ("email_status", "sms_status")


admin.site.register(Notification)
