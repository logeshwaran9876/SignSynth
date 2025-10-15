"""
Text to sign language video generation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List
import structlog
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import verify_api_key_auth, check_rate_limit
from app.core.config import get_settings
from app.core.websocket import send_job_update
from app.models.job import Job, JobCreate, JobResponse, JobStatus
from app.services.gemini_client import GeminiClient
from app.workers.tasks import process_job_task

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/generate", response_model=JobResponse)
async def create_generation_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    #api_auth: bool = Depends(verify_api_key_auth),
      
):
    """
    Create a new text-to-sign language video generation job.
    
    This endpoint accepts text input and creates a background job to generate
    a sign language video. The job is processed asynchronously and status
    updates are sent via WebSocket.
    """
    settings = get_settings()
    
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, settings.RATE_LIMIT_PER_MINUTE, 60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Validate text length
    if len(job_data.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text too long. Maximum length is {settings.MAX_TEXT_LENGTH} characters."
        )
    
    # Check concurrent job limit
    current_jobs = db.query(Job).filter(
        Job.status.in_([JobStatus.QUEUED, JobStatus.PROCESSING])
    ).count()
    
    if current_jobs >= settings.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429,
            detail="Too many concurrent jobs. Please try again later."
        )
    
    try:
        # Extract API key value from headers to store with the job (if present)
        api_key = request.headers.get("x-api-key") or None
        if not api_key:
            auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth_header and auth_header.lower().startswith("bearer "):
                api_key = auth_header.split(None, 1)[1].strip()

        # Create job record
        job = Job(
            text=job_data.text,
            language=job_data.language,
            sign_language=job_data.sign_language.value,
            speed=job_data.speed,
            avatar_id=job_data.avatar_id,
            render_quality=job_data.render_quality.value,
            callback_url=job_data.callback_url,
            job_metadata=job_data.job_metadata,
            api_key=api_key
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info("Job created", job_id=job.id, text_length=len(job_data.text))
        
        # Queue background task
        background_tasks.add_task(process_job_task, job.id)
        
        # Send initial status update
        await send_job_update(job.id, JobStatus.QUEUED, 0)
        
        return JobResponse.from_orm(job)
        
    except Exception as e:
        logger.error("Failed to create job", error=str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create job")


@router.post("/generate/preview")
async def create_preview_job(
    job_data: JobCreate,
    request: Request,
    db: Session = Depends(get_db),
    api_auth: bool = Depends(verify_api_key_auth),
      
):
    """
    Create a quick preview job for short phrases.
    
    This endpoint is optimized for short text inputs and provides
    faster preview generation suitable for real-time feedback.
    """
    settings = get_settings()
    
    # Rate limiting (more lenient for previews)
    client_ip = request.client.host
    if not check_rate_limit(client_ip, settings.RATE_LIMIT_PER_MINUTE * 2, 60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Validate text length (shorter for previews)
    max_preview_length = min(100, settings.MAX_TEXT_LENGTH // 4)
    if len(job_data.text) > max_preview_length:
        raise HTTPException(
            status_code=400,
            detail=f"Preview text too long. Maximum length is {max_preview_length} characters."
        )
    
    try:
        # Create preview job with special settings
        api_key = request.headers.get("x-api-key") or None
        if not api_key:
            auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth_header and auth_header.lower().startswith("bearer "):
                api_key = auth_header.split(None, 1)[1].strip()

        job = Job(
            text=job_data.text,
            language=job_data.language,
            sign_language=job_data.sign_language.value,
            speed=job_data.speed,
            avatar_id=job_data.avatar_id,
            render_quality="preview",  # Force preview quality
            callback_url=job_data.callback_url,
            job_metadata={**(job_data.job_metadata or {}), "is_preview": True},
            api_key=api_key
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info("Preview job created", job_id=job.id, text_length=len(job_data.text))
        
        # Process preview immediately (synchronous for faster response)
        try:
            # Check if Gemini API key is available
            settings = get_settings()
            if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
                # Use mock data for preview when API key is not configured
                pose_data = {
                    "phrases": [
                        {
                            "start": 0,
                            "end": max(2, len(job_data.text) * 0.1),
                            "gloss": [job_data.text],
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
                    "duration": max(2, len(job_data.text) * 0.1),
                    "metadata": {
                        "sign_language": job_data.sign_language.value,
                        "speed": job_data.speed,
                        "complexity": "simple" if len(job_data.text) < 50 else "complex",
                        "mock_data": True
                    }
                }
                logger.info("Using mock pose data for preview", job_id=job.id)
            else:
                # Use real Gemini API
                gemini_client = GeminiClient()
                pose_data = await gemini_client.generate_pose_data(
                    text=job_data.text,
                    sign_language=job_data.sign_language.value,
                    speed=job_data.speed
                )
            
            # Update job with pose data
            job.metadata = {**(job.metadata or {}), "pose_data": pose_data}
            job.status = JobStatus.SUCCEEDED
            job.progress = 100
            job.completed_at = datetime.now(timezone.utc)
            
            db.commit()
            
            return {
                "job_id": job.id,
                "status": job.status,
                "progress": job.progress,
                "pose_data": pose_data,
                "preview_ready": True
            }
            
        except Exception as e:
            logger.error("Preview generation failed", job_id=job.id, error=str(e))
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            db.commit()
            
            raise HTTPException(status_code=500, detail="Preview generation failed")
        
    except Exception as e:
        logger.error("Failed to create preview job", error=str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create preview job")


@router.get("/generate/supported-languages")
async def get_supported_languages():
    """Get list of supported sign languages and their codes."""
    return {
        "sign_languages": [
            {"code": "ASL", "name": "American Sign Language", "region": "North America"},
            {"code": "BSL", "name": "British Sign Language", "region": "United Kingdom"},
            {"code": "ISL", "name": "Irish Sign Language", "region": "Ireland"},
        ],
        "input_languages": [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
        ],
        "speeds": [
            {"code": "slow", "name": "Slow", "multiplier": 0.7},
            {"code": "normal", "name": "Normal", "multiplier": 1.0},
            {"code": "fast", "name": "Fast", "multiplier": 1.3},
        ],
        "qualities": [
            {"code": "preview", "name": "Preview", "resolution": "480p", "fps": 15},
            {"code": "hd", "name": "HD", "resolution": "1080p", "fps": 30},
            {"code": "4k", "name": "4K", "resolution": "2160p", "fps": 30},
        ],
        "avatars": [
            {"id": "default", "name": "Default Avatar", "description": "Standard signing avatar"},
            {"id": "professional", "name": "Professional", "description": "Business attire avatar"},
            {"id": "casual", "name": "Casual", "description": "Casual clothing avatar"},
        ]
    }


@router.get("/generate/limits")
async def get_generation_limits():
    """Get current generation limits and quotas."""
    settings = get_settings()
    
    return {
        "max_text_length": settings.MAX_TEXT_LENGTH,
        "max_concurrent_jobs": settings.MAX_CONCURRENT_JOBS,
        "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
        "rate_limit_burst": settings.RATE_LIMIT_BURST,
        "supported_formats": ["mp4", "webm"],
        "max_duration_seconds": 300,  # 5 minutes
        "preview_max_length": min(100, settings.MAX_TEXT_LENGTH // 4)
    }

