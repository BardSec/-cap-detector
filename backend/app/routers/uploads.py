"""
PCAP upload endpoint.

  POST /api/captures          – upload a PCAP file, queue analysis
  GET  /api/captures          – list user's captures
  GET  /api/captures/{id}     – status + results for a capture
  GET  /api/captures/{id}/export  – full JSON export (includes raw creds)
  DELETE /api/captures/{id}   – delete a capture and its file
"""
from __future__ import annotations

import json
import os
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.jwt_handler import get_current_user_id
from app.config import settings
from app.database import get_db
from app.models import Capture
from app.tasks.analysis_tasks import analyze_pcap

router = APIRouter()

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pcap", ".pcapng", ".cap"}
SAFE_FILENAME = re.compile(r"[^a-zA-Z0-9_.\-]")


def _safe_name(name: str) -> str:
    stem = Path(name).stem
    suffix = Path(name).suffix.lower()
    stem = SAFE_FILENAME.sub("_", stem)[:80]
    return f"{stem}{suffix}"


@router.post("/captures", status_code=202)
async def upload_capture(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    suffix = Path(file.filename or "file.pcap").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Upload a .pcap, .pcapng, or .cap file.",
        )

    safe_name = _safe_name(file.filename or "upload.pcap")
    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}_{safe_name}"

    # Stream to disk with size enforcement
    written = 0
    max_bytes = settings.max_upload_bytes
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 256):  # 256 KB chunks
            written += len(chunk)
            if written > max_bytes:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds the {settings.max_upload_mb} MB limit.",
                )
            f.write(chunk)

    capture = Capture(
        user_id=user_id,
        filename=safe_name,
        file_path=str(dest),
        file_size=written,
        status="pending",
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    # Queue analysis task
    analyze_pcap.apply_async(
        args=[capture.id, str(dest)],
        queue="pcap",
    )

    return {"id": capture.id, "status": "pending", "filename": safe_name}


@router.get("/captures")
def list_captures(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    captures = (
        db.query(Capture)
        .filter(Capture.user_id == user_id)
        .order_by(Capture.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": c.id,
            "filename": c.filename,
            "file_size": c.file_size,
            "status": c.status,
            "packet_count": c.packet_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        }
        for c in captures
    ]


@router.get("/captures/{capture_id}")
def get_capture(
    capture_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    capture = db.query(Capture).filter(
        Capture.id == capture_id, Capture.user_id == user_id
    ).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    results = json.loads(capture.results) if capture.results else None
    return {
        "id": capture.id,
        "filename": capture.filename,
        "file_size": capture.file_size,
        "status": capture.status,
        "error": capture.error,
        "packet_count": capture.packet_count,
        "created_at": capture.created_at.isoformat() if capture.created_at else None,
        "completed_at": capture.completed_at.isoformat() if capture.completed_at else None,
        "results": results,
    }


@router.get("/captures/{capture_id}/export")
def export_capture(
    capture_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Full JSON export — includes raw (unmasked) credentials for IR workflows."""
    capture = db.query(Capture).filter(
        Capture.id == capture_id, Capture.user_id == user_id
    ).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    if capture.status != "complete":
        raise HTTPException(status_code=409, detail="Analysis not yet complete")

    results = json.loads(capture.results) if capture.results else {}
    return JSONResponse(
        content={
            "capture": {
                "id": capture.id,
                "filename": capture.filename,
                "file_size": capture.file_size,
                "packet_count": capture.packet_count,
                "analyzed_at": capture.completed_at.isoformat() if capture.completed_at else None,
            },
            "results": results,
        },
        headers={"Content-Disposition": f'attachment; filename="bloodhound_{capture_id}.json"'},
    )


@router.delete("/captures/{capture_id}", status_code=204)
def delete_capture(
    capture_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    capture = db.query(Capture).filter(
        Capture.id == capture_id, Capture.user_id == user_id
    ).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    Path(capture.file_path).unlink(missing_ok=True)
    db.delete(capture)
    db.commit()
