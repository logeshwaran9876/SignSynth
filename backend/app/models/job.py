"""
Job model for sign language video generation tasks.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum

from app.core.database import Base


class JobStatus(str, Enum):
    """Job status enumeration."""
    QUEUED = "queued"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RenderQuality(str, Enum):
    """Render quality enumeration."""
    PREVIEW = "preview"
    HD = "hd"
    K4 = "4k"


class SignLanguage(str, Enum):
    """Supported sign languages."""
    ASL = "ASL"  # American Sign Language
    BSL = "BSL"  # British Sign Language
    ISL = "ISL"  # Irish Sign Language


class Job(Base):
    """Job model for database storage."""
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    sign_language = Column(String(10), default="ASL")
    speed = Column(String(20), default="normal")
    avatar_id = Column(String(50), default="default")
    render_quality = Column(String(20), default="hd")
    
    status = Column(String(20), default=JobStatus.QUEUED)
    progress = Column(Integer, default=0)
    
    # File paths
    preview_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Error information
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Timing information
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Processing information
    processing_time = Column(Float, nullable=True)  # in seconds
    file_size = Column(Integer, nullable=True)  # in bytes
    duration = Column(Float, nullable=True)  # video duration in seconds
    
    # User information
    user_id = Column(String(100), nullable=True)
    api_key = Column(String(100), nullable=True)
    
    # Callback information
    callback_url = Column(String(500), nullable=True)
    callback_sent = Column(Boolean, default=False)
    
    # Additional metadata
    job_metadata = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<Job(id={self.id}, status={self.status}, text='{self.text[:50]}...')>"


# Pydantic models for API
class JobCreate(BaseModel):
    """Model for creating a new job."""
    text: str = Field(..., min_length=1, max_length=1000, description="Text to convert to sign language")
    language: str = Field(default="en", description="Input language code")
    sign_language: SignLanguage = Field(default=SignLanguage.ASL, description="Target sign language")
    speed: str = Field(default="normal", description="Signing speed (slow, normal, fast)")
    avatar_id: str = Field(default="default", description="Avatar to use for signing")
    render_quality: RenderQuality = Field(default=RenderQuality.HD, description="Video quality")
    callback_url: Optional[str] = Field(default=None, description="Callback URL for completion notification")
    job_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class JobUpdate(BaseModel):
    """Model for updating job status."""
    status: JobStatus
    progress: Optional[int] = Field(None, ge=0, le=100)
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    preview_url: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    duration: Optional[float] = None


class JobResponse(BaseModel):
    """Model for job API responses."""
    id: str
    text: str
    language: str
    sign_language: str
    speed: str
    avatar_id: str
    render_quality: str
    status: JobStatus
    progress: int
    preview_url: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    duration: Optional[float] = None
    job_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Model for paginated job list responses."""
    jobs: List[JobResponse]
    total: int
    page: int
    per_page: int
    pages: int


class JobStats(BaseModel):
    """Model for job statistics."""
    total_jobs: int
    queued_jobs: int
    processing_jobs: int
    succeeded_jobs: int
    failed_jobs: int
    cancelled_jobs: int
    average_processing_time: Optional[float] = None
    total_processing_time: Optional[float] = None

