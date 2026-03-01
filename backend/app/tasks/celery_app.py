from celery import Celery
from app.config import settings

celery_app = Celery(
    "pcap_bloodhound",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.analysis_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={"app.tasks.analysis_tasks.analyze_pcap": {"queue": "pcap"}},
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
