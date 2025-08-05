# Users models module
# This file imports all models to maintain backwards compatibility

from .user import User
from .profiles import (
    BaseProfile,
    LandlordProfile,
    TenantProfile,
    ServiceProviderProfile,
)
from .resume import UserResume, PortfolioItem
from .admin import (
    AdminImpersonationSession,
    AdminActionLog,
    UserActionNotification,
    AdminSessionSummary,
)
from .activity import UserActivityLog
from .settings import UserSettings
from .interview import (
    InterviewCode,
    ContactRequest,
    InterviewSession,
)

# Expose all models for backwards compatibility
__all__ = [
    'User',
    'BaseProfile',
    'LandlordProfile',
    'TenantProfile',
    'ServiceProviderProfile',
    'UserResume',
    'PortfolioItem',
    'AdminImpersonationSession',
    'AdminActionLog',
    'UserActionNotification',
    'UserActivityLog',
    'AdminSessionSummary',
    'UserSettings',
    'InterviewCode',
    'ContactRequest',
    'InterviewSession',
]