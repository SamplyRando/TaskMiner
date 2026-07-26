from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging


configure_logging(settings.log_level)

app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    debug=settings.debug,
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
