from django.contrib import admin

from .models import Customer, Response

admin.site.register(Customer)


@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ("customer", "mean", "category", "channel", "created_at")
    list_filter = ("category", "channel")
