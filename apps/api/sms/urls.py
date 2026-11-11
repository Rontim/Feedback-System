from django.urls import path

from . import views

urlpatterns = [
    path("sms/inbound", views.InboundSmsView.as_view()),
    path("sms/invites", views.InviteView.as_view()),
    path("sms/config", views.SmsConfigView.as_view()),
    path("sms/log", views.SmsLogListView.as_view()),
]
