from app.routers.auth import router as auth_router
from app.routers.donors import router as donors_router
from app.routers.requests import router as requests_router
from app.routers.camps import router as camps_router
from app.routers.ai import router as ai_router
from app.routers.slots import router as slots_router
from app.routers.appointments import router as appointments_router
from app.routers.inventory import router as inventory_router
from app.routers.notifications import router as notifications_router
from app.routers.analytics import router as analytics_router
from app.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "donors_router",
    "requests_router",
    "camps_router",
    "ai_router",
    "slots_router",
    "appointments_router",
    "inventory_router",
    "notifications_router",
    "analytics_router",
    "admin_router"
]
