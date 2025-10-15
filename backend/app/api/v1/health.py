"""
Health check endpoints for monitoring and status.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import psutil
import structlog

from app.core.database import get_db
from app.core.config import get_settings
from app.models.job import Job, JobStatus

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with system metrics."""
    settings = get_settings()
    
    try:
        # Check database connection
        db_status = "healthy"
        try:
            db.execute("SELECT 1")
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
        
        # Check Redis connection
        redis_status = "healthy"
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL)
            r.ping()
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get job statistics
        total_jobs = db.query(Job).count()
        queued_jobs = db.query(Job).filter(Job.status == JobStatus.QUEUED).count()
        processing_jobs = db.query(Job).filter(Job.status == JobStatus.PROCESSING).count()
        failed_jobs = db.query(Job).filter(Job.status == JobStatus.FAILED).count()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": db_status,
                "redis": redis_status
            },
            "system": {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100
                }
            },
            "jobs": {
                "total": total_jobs,
                "queued": queued_jobs,
                "processing": processing_jobs,
                "failed": failed_jobs
            }
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unavailable")


@router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness check for Kubernetes/container orchestration."""
    try:
        # Check database
        db.execute("SELECT 1")
        
        # Check Redis
        import redis
        r = redis.from_url(get_settings().REDIS_URL)
        r.ping()
        
        return {"status": "ready"}
        
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Not ready")


@router.get("/health/live")
async def liveness_check():
    """Liveness check for Kubernetes/container orchestration."""
    return {"status": "alive"}

