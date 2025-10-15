"""
Worker tasks for sign language video rendering.
"""

import os
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import structlog

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'backend'))

from celery import Celery
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.websocket import send_job_update
from app.models.job import Job, JobStatus
from app.services.gemini_client import GeminiClient
from app.services.renderer_blender import BlenderRenderer
from app.services.renderer_gltf import WebGLRenderer
from app.services.ffmpeg_utils import FFmpegUtils

logger = structlog.get_logger(__name__)

# Create Celery app
settings = get_settings()
celery_app = Celery(
    "signsynth_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
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
)


@celery_app.task(bind=True)
def process_job_task(self, job_id: str):
    """
    Main task for processing a sign language video generation job.
    
    Args:
        job_id: ID of the job to process
        
    Returns:
        Dict with job processing results
    """
    logger.info("Starting job processing", job_id=job_id, task_id=self.request.id)
    
    # Run the async processing in a new event loop
    try:
        # Create a new event loop for this task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(_process_job_task_async(job_id))
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error("Job processing failed", job_id=job_id, error=str(e))
        return {"error": str(e)}


async def _process_job_task_async(job_id: str):
    """Async wrapper for job processing."""
    db = SessionLocal()
    try:
        # Get job from database
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error("Job not found", job_id=job_id)
            return {"error": "Job not found"}
        
        # Update job status to processing
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        
        # Send status update
        await send_job_update(job_id, JobStatus.PROCESSING, 10)
        
        # Process the job
        result = await _process_job_async(job, db)
        
        return result
        
    except Exception as e:
        logger.error("Job processing failed", job_id=job_id, error=str(e))
        
        # Update job status to failed
        if 'job' in locals():
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            
            # Send status update
            await send_job_update(job_id, JobStatus.FAILED, 0, {"error": str(e)})
        
        return {"error": str(e)}
    
    finally:
        db.close()


async def _process_job_async(job: Job, db: Session) -> Dict[str, Any]:
    """Async processing of a job."""
    job_id = job.id
    
    try:
        # Step 1: Generate pose data (20% progress)
        logger.info("Generating pose data", job_id=job_id)
        await send_job_update(job_id, JobStatus.PROCESSING, 20)
        
        # Check if Gemini API key is available
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            # Use mock data when API key is not configured
            pose_data = {
                "phrases": [
                    {
                        "start": 0,
                        "end": max(2, len(job.text) * 0.1),
                        "gloss": [job.text],
                        "hands": {
                            "left": [{"x": 0, "y": 0, "z": 0}],
                            "right": [{"x": 0, "y": 0, "z": 0}]
                        },
                        "joints": {
                            "head": {"x": 0, "y": 1.6, "z": 0},
                            "neck": {"x": 0, "y": 1.4, "z": 0},
                            "shoulder_left": {"x": -0.3, "y": 1.2, "z": 0},
                            "shoulder_right": {"x": 0.3, "y": 1.2, "z": 0},
                            "elbow_left": {"x": -0.3, "y": 0.9, "z": 0},
                            "elbow_right": {"x": 0.3, "y": 0.9, "z": 0},
                            "wrist_left": {"x": -0.3, "y": 0.6, "z": 0},
                            "wrist_right": {"x": 0.3, "y": 0.6, "z": 0},
                            "hip_left": {"x": -0.1, "y": 0.8, "z": 0},
                            "hip_right": {"x": 0.1, "y": 0.8, "z": 0},
                            "knee_left": {"x": -0.1, "y": 0.4, "z": 0},
                            "knee_right": {"x": 0.1, "y": 0.4, "z": 0},
                            "ankle_left": {"x": -0.1, "y": 0, "z": 0},
                            "ankle_right": {"x": 0.1, "y": 0, "z": 0}
                        },
                        "facial": {
                            "brow_raise": 0,
                            "mouth_open": 0,
                            "eye_blink": 0,
                            "smile": 0,
                            "frown": 0
                        },
                        "confidence": 0.9
                    }
                ],
                "fps": 30,
                "duration": max(2, len(job.text) * 0.1),
                "metadata": {
                    "sign_language": job.sign_language,
                    "speed": job.speed,
                    "complexity": "simple" if len(job.text) < 50 else "complex",
                    "mock_data": True
                }
            }
            logger.info("Using mock pose data for video generation", job_id=job_id)
        else:
            # Use real Gemini API
            gemini_client = GeminiClient()
            pose_data = await gemini_client.generate_pose_data(
                text=job.text,
                sign_language=job.sign_language,
                speed=job.speed
            )
        
        # Store pose data in job metadata
        if not job.metadata:
            job.metadata = {}
        job.metadata["pose_data"] = pose_data
        db.commit()
        
        # Step 2: Render video (60% progress)
        logger.info("Rendering video", job_id=job_id)
        await send_job_update(job_id, JobStatus.PROCESSING, 40)
        
        # Choose renderer based on quality
        if job.render_quality == "preview":
            renderer = WebGLRenderer()
        else:
            # Try Blender first, fallback to WebGL
            try:
                renderer = BlenderRenderer()
            except RuntimeError:
                logger.warning("Blender not available, using WebGL renderer")
                renderer = WebGLRenderer()
        
        # Create output directory
        output_dir = os.path.join(settings.OUTPUT_DIR, job_id)
        os.makedirs(output_dir, exist_ok=True)
        
        # Render video
        video_path = os.path.join(output_dir, f"{job_id}.mp4")
        render_result = await renderer.render_video(
            pose_data=pose_data,
            output_path=video_path,
            quality=job.render_quality
        )
        
        # Step 3: Create thumbnail (80% progress)
        logger.info("Creating thumbnail", job_id=job_id)
        await send_job_update(job_id, JobStatus.PROCESSING, 80)
        
        ffmpeg_utils = FFmpegUtils()
        thumbnail_path = os.path.join(output_dir, f"{job_id}_thumb.jpg")
        
        await ffmpeg_utils.create_thumbnail(
            video_path=video_path,
            output_path=thumbnail_path,
            timestamp=1.0,
            size=(320, 240)
        )
        
        # Step 4: Update job with results (100% progress)
        logger.info("Finalizing job", job_id=job_id)
        await send_job_update(job_id, JobStatus.PROCESSING, 100)
        
        # Calculate processing time
        processing_time = (datetime.now(timezone.utc) - job.started_at).total_seconds()
        
        # Update job status
        job.status = JobStatus.SUCCEEDED
        job.completed_at = datetime.now(timezone.utc)
        job.processing_time = processing_time
        job.video_url = f"/api/v1/jobs/{job_id}/download"
        job.thumbnail_url = f"/api/v1/jobs/{job_id}/thumbnail"
        job.file_size = render_result.get("file_size", 0)
        job.duration = render_result.get("duration", 0)
        
        # Update metadata with render info
        job.metadata.update({
            "render_result": render_result,
            "renderer": renderer.__class__.__name__,
            "frames_rendered": render_result.get("frames_rendered", 0)
        })
        
        db.commit()
        
        # Send final status update
        await send_job_update(job_id, JobStatus.SUCCEEDED, 100, {
            "video_url": job.video_url,
            "thumbnail_url": job.thumbnail_url,
            "processing_time": processing_time,
            "file_size": job.file_size,
            "duration": job.duration
        })
        
        logger.info("Job completed successfully", 
                   job_id=job_id,
                   processing_time=processing_time,
                   file_size=job.file_size)
        
        return {
            "success": True,
            "job_id": job_id,
            "video_url": job.video_url,
            "thumbnail_url": job.thumbnail_url,
            "processing_time": processing_time,
            "file_size": job.file_size,
            "duration": job.duration
        }
        
    except Exception as e:
        logger.error("Job processing failed", job_id=job_id, error=str(e))
        
        # Update job status to failed
        job.status = JobStatus.FAILED
        job.error_message = str(e)
        job.completed_at = datetime.now(timezone.utc)
        
        if job.started_at:
            job.processing_time = (datetime.now(timezone.utc) - job.started_at).total_seconds()
        
        db.commit()
        
        # Send error status update
        await send_job_update(job_id, JobStatus.FAILED, 0, {"error": str(e)})
        
        raise


@celery_app.task
def cleanup_old_jobs():
    """Cleanup task to remove old completed jobs and temporary files."""
    logger.info("Starting cleanup of old jobs")
    
    db = SessionLocal()
    try:
        # Find jobs older than 7 days
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        old_jobs = db.query(Job).filter(
            Job.completed_at < cutoff_date,
            Job.status.in_([JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED])
        ).all()
        
        cleaned_count = 0
        for job in old_jobs:
            try:
                # Remove job files
                job_dir = os.path.join(settings.OUTPUT_DIR, job.id)
                if os.path.exists(job_dir):
                    import shutil
                    shutil.rmtree(job_dir)
                
                # Remove job from database
                db.delete(job)
                cleaned_count += 1
                
            except Exception as e:
                logger.warning("Failed to cleanup job", job_id=job.id, error=str(e))
        
        db.commit()
        
        logger.info("Cleanup completed", cleaned_count=cleaned_count)
        return {"cleaned_count": cleaned_count}
        
    except Exception as e:
        logger.error("Cleanup failed", error=str(e))
        return {"error": str(e)}
    
    finally:
        db.close()


@celery_app.task
def health_check():
    """Health check task for monitoring worker status."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "worker_id": os.getpid()
    }


@celery_app.task
def generate_preview_task(job_id: str, pose_data: Dict[str, Any]):
    """Generate a quick preview for a job."""
    logger.info("Generating preview", job_id=job_id)
    
    try:
        # Create a new event loop for this task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(_generate_preview_async(job_id, pose_data))
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error("Preview generation failed", job_id=job_id, error=str(e))
        return {"error": str(e)}


async def _generate_preview_async(job_id: str, pose_data: Dict[str, Any]):
    """Async preview generation."""
    try:
        # Use WebGL renderer for quick preview
        renderer = WebGLRenderer()
        
        # Create preview output path
        output_dir = os.path.join(settings.OUTPUT_DIR, job_id)
        os.makedirs(output_dir, exist_ok=True)
        
        preview_path = os.path.join(output_dir, f"{job_id}_preview.webm")
        
        # Render preview
        render_result = await renderer.render_video(
            pose_data=pose_data,
            output_path=preview_path,
            quality="preview"
        )
        
        return {
            "success": True,
            "preview_path": preview_path,
            "render_result": render_result
        }
        
    except Exception as e:
        logger.error("Preview generation failed", job_id=job_id, error=str(e))
        return {"error": str(e)}


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

