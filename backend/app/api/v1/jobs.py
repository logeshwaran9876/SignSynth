"""
Job management and status endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
import structlog
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import verify_api_key_auth, get_current_user
from app.core.config import get_settings
from app.models.job import Job, JobResponse, JobListResponse, JobStats, JobStatus
from app.models.user import User

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: Session = Depends(get_db),
     
):
    """Get job details by ID."""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse.from_orm(job)


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[JobStatus] = Query(None, description="Filter by status"),
    sign_language: Optional[str] = Query(None, description="Filter by sign language"),
    created_after: Optional[datetime] = Query(None, description="Filter jobs created after this date"),
    created_before: Optional[datetime] = Query(None, description="Filter jobs created before this date"),
    db: Session = Depends(get_db),
    
):
    """List jobs with pagination and filtering."""
    
    # Build query
    query = db.query(Job)
    
    # Apply filters
    if status:
        query = query.filter(Job.status == status)
    
    if sign_language:
        query = query.filter(Job.sign_language == sign_language)
    
    if created_after:
        query = query.filter(Job.created_at >= created_after)
    
    if created_before:
        query = query.filter(Job.created_at <= created_before)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(per_page).all()
    
    # Calculate pagination info
    pages = (total + per_page - 1) // per_page
    
    return JobListResponse(
        jobs=[JobResponse.from_orm(job) for job in jobs],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/jobs/stats", response_model=JobStats)
async def get_job_stats(
    days: int = Query(7, ge=1, le=365, description="Number of days to include in stats"),
    db: Session = Depends(get_db),
     
):
    """Get job statistics for the specified time period."""
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Base query for the time period
    base_query = db.query(Job).filter(Job.created_at >= start_date)
    
    # Get counts by status
    total_jobs = base_query.count()
    queued_jobs = base_query.filter(Job.status == JobStatus.QUEUED).count()
    processing_jobs = base_query.filter(Job.status == JobStatus.PROCESSING).count()
    succeeded_jobs = base_query.filter(Job.status == JobStatus.SUCCEEDED).count()
    failed_jobs = base_query.filter(Job.status == JobStatus.FAILED).count()
    cancelled_jobs = base_query.filter(Job.status == JobStatus.CANCELLED).count()
    
    # Get processing time statistics
    processing_times = db.query(Job.processing_time).filter(
        Job.status == JobStatus.SUCCEEDED,
        Job.processing_time.isnot(None),
        Job.created_at >= start_date
    ).all()
    
    if processing_times:
        times = [pt[0] for pt in processing_times if pt[0] is not None]
        average_processing_time = sum(times) / len(times)
        total_processing_time = sum(times)
    else:
        average_processing_time = None
        total_processing_time = None
    
    return JobStats(
        total_jobs=total_jobs,
        queued_jobs=queued_jobs,
        processing_jobs=processing_jobs,
        succeeded_jobs=succeeded_jobs,
        failed_jobs=failed_jobs,
        cancelled_jobs=cancelled_jobs,
        average_processing_time=average_processing_time,
        total_processing_time=total_processing_time
    )


@router.delete("/jobs/{job_id}")
async def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
     
):
    """Cancel a job if it's still queued or processing."""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [JobStatus.QUEUED, JobStatus.PROCESSING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job.status}"
        )
    
    # Update job status
    job.status = JobStatus.CANCELLED
    job.completed_at = datetime.utcnow()
    job.error_message = "Job cancelled by user"
    
    db.commit()
    
    logger.info("Job cancelled", job_id=job_id)
    
    return {"message": "Job cancelled successfully"}


@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    db: Session = Depends(get_db),
     
):
    """Retry a failed job."""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry job with status: {job.status}"
        )
    
    # Reset job status
    job.status = JobStatus.QUEUED
    job.progress = 0
    job.error_message = None
    job.error_details = None
    job.started_at = None
    job.completed_at = None
    job.processing_time = None
    
    db.commit()
    
    # Queue the job for processing
    from app.workers.tasks import process_job_task
    process_job_task.delay(job_id)
    
    logger.info("Job queued for retry", job_id=job_id)
    
    return {"message": "Job queued for retry"}


@router.get("/jobs/{job_id}/download")
async def get_job_download_url(
    job_id: str,
    db: Session = Depends(get_db),
     
):
    """Get download URL for completed job."""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.SUCCEEDED:
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job.status}"
        )
    
    if not job.video_url:
        raise HTTPException(status_code=404, detail="Video not available")
    
    # In a real implementation, you would generate a signed URL here
    # For now, return the direct URL
    return {
        "download_url": job.video_url,
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "file_size": job.file_size,
        "duration": job.duration
    }


# Admin endpoints (require admin authentication)
@router.get("/admin/jobs", response_model=JobListResponse)
async def admin_list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to list all jobs."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = db.query(Job)
    
    if user_id:
        query = query.filter(Job.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(per_page).all()
    
    # Calculate pagination info
    pages = (total + per_page - 1) // per_page
    
    return JobListResponse(
        jobs=[JobResponse.from_orm(job) for job in jobs],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.delete("/admin/jobs/{job_id}")
async def admin_delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to delete a job."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete job
    db.delete(job)
    db.commit()
    
    logger.info("Job deleted by admin", job_id=job_id, admin_user=current_user.username)
    
    return {"message": "Job deleted successfully"}

