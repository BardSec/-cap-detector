import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, uploads

logger = logging.getLogger(__name__)

# Create tables on startup (use Alembic in production for migrations).
# If the database is unreachable the process exits with a clear message
# rather than crashing with an opaque SQLAlchemy traceback.
try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:
    logger.critical(
        "Cannot connect to the database at startup: %s\n"
        "Check that the postgres container is running and DATABASE_URL is correct.",
        exc,
    )
    sys.exit(1)

app = FastAPI(
    title="PCAP Bloodhound",
    description="Network threat-hunting tool for K-12 practitioners",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(uploads.router, prefix="/api", tags=["captures"])


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "pcap-bloodhound"}
