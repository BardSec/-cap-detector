from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, uploads

# Create tables on startup (use Alembic in production for migrations)
Base.metadata.create_all(bind=engine)

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
