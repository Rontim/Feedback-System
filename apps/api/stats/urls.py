from django.urls import path

from . import views

urlpatterns = [
    path("stats/summary", views.SummaryView.as_view()),
    path("stats/trend", views.TrendView.as_view()),
    path("stats/topics", views.TopicsView.as_view()),
]
