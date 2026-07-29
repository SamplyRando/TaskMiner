from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.database.database import SessionLocal
from app.listeners.activity import ActivityListener


configure_logging(settings.log_level)
activity_listener = ActivityListener(SessionLocal)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    activity_listener.start()
    try:
        yield
    finally:
        activity_listener.stop()


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["system"])
def read_root() -> dict[str, str]:
    return {
        "project": settings.project_name,
        "version": settings.version,
        "docs": app.docs_url or "/docs",
    }


@app.get("/health", tags=["system"])
def read_health() -> dict[str, str]:
    return {
        "status": "running",
        "project": settings.project_name,
        "version": settings.version,
    }
