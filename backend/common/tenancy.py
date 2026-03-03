"""Utilities for request-scoped tenant context and tenant-aware query managers."""

from contextvars import ContextVar

from django.db import models


_current_tenant_school_id: ContextVar[int | None] = ContextVar(
    "current_tenant_school_id", default=None
)


def set_current_tenant_school_id(school_id):
    """Set request-scoped tenant school id and return context token."""
    return _current_tenant_school_id.set(school_id)


def reset_current_tenant_school_id(token) -> None:
    """Reset request-scoped tenant school id from token."""
    _current_tenant_school_id.reset(token)


def get_current_tenant_school_id():
    """Return current request-scoped tenant school id, if any."""
    return _current_tenant_school_id.get()


class TenantQuerySet(models.QuerySet):
    """QuerySet with explicit helpers for tenant filtering."""

    def for_school(self, school_id, school_field: str = "colegio_id"):
        return self.filter(**{school_field: school_id})


class TenantManager(models.Manager):
    """
    Manager with automatic filtering by current request tenant context.

    Use `.all_schools()` to bypass tenant filtering intentionally.
    """

    def __init__(
        self,
        *args,
        school_field: str = "colegio_id",
        coerce_school_id_to_str: bool = False,
        **kwargs,
    ):
        self.school_field = school_field
        self.coerce_school_id_to_str = coerce_school_id_to_str
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        queryset = TenantQuerySet(self.model, using=self._db)
        school_id = get_current_tenant_school_id()
        if school_id is None:
            return queryset
        school_value = str(school_id) if self.coerce_school_id_to_str else school_id
        return queryset.filter(**{self.school_field: school_value})

    def all_schools(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_school(self, school_id):
        school_value = str(school_id) if self.coerce_school_id_to_str else school_id
        return self.all_schools().for_school(school_value, self.school_field)
