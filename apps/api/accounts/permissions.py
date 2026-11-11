from rest_framework.permissions import BasePermission


class IsCareRep(BasePermission):
    """Default for every API view. Public views opt out with `permission_classes = []`."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_care_rep)
