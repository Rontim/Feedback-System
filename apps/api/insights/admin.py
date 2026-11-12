from django.contrib import admin

from .models import CommentAnalysis


@admin.register(CommentAnalysis)
class CommentAnalysisAdmin(admin.ModelAdmin):
    list_display = ("response", "sentiment", "topic", "model", "created_at")
    list_filter = ("sentiment", "topic")
