"""
User model for authentication and user management.
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

from app.core.database import Base


class User(Base):
    """User model for database storage."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # User status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    # API access
    api_key = Column(String(100), unique=True, nullable=True, index=True)
    rate_limit_per_minute = Column(Integer, default=60)
    
    # Usage tracking
    total_jobs = Column(Integer, default=0)
    successful_jobs = Column(Integer, default=0)
    failed_jobs = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


# Pydantic models for API
class UserCreate(BaseModel):
    """Model for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Model for updating user information."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_admin: Optional[bool] = None
    rate_limit_per_minute: Optional[int] = Field(None, ge=1, le=1000)


class UserResponse(BaseModel):
    """Model for user API responses."""
    id: str
    username: str
    email: str
    is_active: bool
    is_verified: bool
    is_admin: bool
    api_key: Optional[str] = None
    rate_limit_per_minute: int
    total_jobs: int
    successful_jobs: int
    failed_jobs: int
    created_at: datetime
    last_login: Optional[datetime] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Model for user login."""
    username: str
    password: str


class Token(BaseModel):
    """Model for authentication token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordChange(BaseModel):
    """Model for password change."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class APIKeyResponse(BaseModel):
    """Model for API key response."""
    api_key: str
    created_at: datetime

