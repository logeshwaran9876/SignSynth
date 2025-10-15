"""
Celery application configuration for worker processes.
"""

from celery import Celery
import os

# Get Redis URL from environment
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create Celery app
celery_app = Celery(
    "signsynth_worker",
    broker=redis_url,
    backend=redis_url,
    include=["worker.tasks.render_task"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes
    task_soft_time_limit=1500,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=10,
    worker_concurrency=2,  # Number of concurrent workers
)

# Periodic tasks
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'cleanup-old-jobs': {
        'task': 'worker.tasks.render_task.cleanup_old_jobs',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
    },
    'health-check': {
        'task': 'worker.tasks.render_task.health_check',
        'schedule': 300.0,  # Run every 5 minutes
    },
}

if __name__ == "__main__":
    celery_app.start()

