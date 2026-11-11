from django.contrib import admin

from .models import SmsLog


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "direction", "kind", "phone", "status")
    list_filter = ("direction", "kind", "status")
    search_fields = ("phone", "body")
