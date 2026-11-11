from django.urls import path

from .views import FeedbackCreateView, ResponseDetailView, ResponseListView

urlpatterns = [
    path("feedback", FeedbackCreateView.as_view()),
    path("responses", ResponseListView.as_view()),
    path("responses/<int:pk>", ResponseDetailView.as_view()),
]
