from fastapi import APIRouter
from . import analytics, auth, evaluations, misc, reports, reviews

api_router=APIRouter()
api_router.include_router(auth.router)
api_router.include_router(evaluations.router)
api_router.include_router(reviews.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
api_router.include_router(misc.router)
