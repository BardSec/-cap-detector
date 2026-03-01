"""
Celery task: run all PCAP analyzers against an uploaded capture file.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=0, name="app.tasks.analysis_tasks.analyze_pcap")
def analyze_pcap(self, capture_id: int, file_path: str) -> None:
    # Import here to keep the worker startup lean
    from scapy.all import PcapReader  # noqa: PLC0415

    from app.analyzers.c2_beacon import analyze_c2_beaconing
    from app.analyzers.cleartext import analyze_cleartext_credentials
    from app.analyzers.dns_tunnel import analyze_dns_tunneling
    from app.analyzers.exfil import analyze_exfiltration
    from app.analyzers.ntlm import analyze_ntlm
    from app.database import SessionLocal
    from app.models import Capture

    db = SessionLocal()
    try:
        capture = db.query(Capture).filter(Capture.id == capture_id).first()
        if not capture:
            logger.error("Capture %d not found", capture_id)
            return

        capture.status = "processing"
        db.commit()

        logger.info("Starting PCAP analysis for capture %d: %s", capture_id, file_path)

        # Read all packets into memory once — re-used by all analyzers
        packets: list = []
        with PcapReader(file_path) as reader:
            for pkt in reader:
                packets.append(pkt)

        packet_count = len(packets)
        logger.info("Loaded %d packets for capture %d", packet_count, capture_id)

        c2_results = analyze_c2_beaconing(packets)
        dns_results = analyze_dns_tunneling(packets)
        ntlm_results = analyze_ntlm(packets)
        cred_results = analyze_cleartext_credentials(packets)
        exfil_results = analyze_exfiltration(packets)

        # Strip `password_raw` from in-DB results — it lives only in JSON export
        safe_creds = [
            {k: v for k, v in c.items() if k != "password_raw"} for c in cred_results
        ]

        capture.results = json.dumps(
            {
                "c2_beaconing": c2_results,
                "dns_tunneling": dns_results,
                "ntlm_hashes": ntlm_results,
                "cleartext_credentials": safe_creds,
                "exfiltration": exfil_results,
                "packet_count": packet_count,
                # Summary counts for the dashboard header
                "summary": {
                    "c2_beacon_count": len(c2_results),
                    "dns_tunnel_domain_count": len(dns_results.get("tunnel_domains", [])),
                    "ntlm_hash_count": sum(
                        1 for r in ntlm_results if r.get("type") == "AUTHENTICATE"
                    ),
                    "cleartext_cred_count": len(cred_results),
                    "exfil_flow_count": len(exfil_results),
                },
            },
            default=str,
        )
        # Store raw creds separately for the export endpoint
        capture.status = "complete"
        capture.packet_count = packet_count
        capture.completed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("Analysis complete for capture %d", capture_id)

    except Exception as exc:
        logger.exception("Analysis failed for capture %d", capture_id)
        try:
            capture = db.query(Capture).filter(Capture.id == capture_id).first()
            if capture:
                capture.status = "failed"
                capture.error = str(exc)[:2000]
                db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()
