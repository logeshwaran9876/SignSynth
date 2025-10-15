"""
Configuration management for SignSynth application.
Uses Pydantic Settings for environment variable handling.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    GEMINI_API_KEY: str = Field(..., env="GEMINI_API_KEY")
    API_KEY: str = Field(..., env="API_KEY")
    
    # Database & Cache
    REDIS_URL: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    DATABASE_URL: str = Field(default="sqlite:///./signsynth.db", env="DATABASE_URL")
    
    # Storage Configuration
    STORAGE_TYPE: str = Field(default="local", env="STORAGE_TYPE")
    S3_BUCKET: Optional[str] = Field(default=None, env="S3_BUCKET")
    S3_ACCESS_KEY: Optional[str] = Field(default=None, env="S3_ACCESS_KEY")
    S3_SECRET_KEY: Optional[str] = Field(default=None, env="S3_SECRET_KEY")
    S3_ENDPOINT_URL: str = Field(default="https://s3.amazonaws.com", env="S3_ENDPOINT_URL")
    S3_REGION: str = Field(default="us-east-1", env="S3_REGION")
    
    # Application Settings
    DEBUG: bool = Field(default=False, env="DEBUG")
    LOG_LEVEL: str = Field(default="info", env="LOG_LEVEL")
    MAX_TEXT_LENGTH: int = Field(default=1000, env="MAX_TEXT_LENGTH")
    MAX_CONCURRENT_JOBS: int = Field(default=5, env="MAX_CONCURRENT_JOBS")
    DEFAULT_AVATAR_ID: str = Field(default="default", env="DEFAULT_AVATAR_ID")
    DEFAULT_RENDER_QUALITY: str = Field(default="hd", env="DEFAULT_RENDER_QUALITY")
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash-latest", env="GEMINI_MODEL")
    
    # Rendering Configuration
    BLENDER_PATH: str = Field(default="/usr/bin/blender", env="BLENDER_PATH")
    FFMPEG_PATH: str = Field(default="/usr/bin/ffmpeg", env="FFMPEG_PATH")
    RENDER_FPS: int = Field(default=30, env="RENDER_FPS")
    PREVIEW_FPS: int = Field(default=15, env="PREVIEW_FPS")
    
    # Security
    JWT_SECRET_KEY: str = Field(default="your-secret-key-change-in-production", env="JWT_SECRET_KEY")
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        env="CORS_ORIGINS"
    )
    
    # WebSocket Configuration
    WEBSOCKET_URL: str = Field(default="ws://localhost:8000/ws", env="WEBSOCKET_URL")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    RATE_LIMIT_BURST: int = Field(default=10, env="RATE_LIMIT_BURST")
    
    # Monitoring
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    METRICS_PORT: int = Field(default=9090, env="METRICS_PORT")
    
    # File paths
    UPLOAD_DIR: str = Field(default="./uploads", env="UPLOAD_DIR")
    OUTPUT_DIR: str = Field(default="./outputs", env="OUTPUT_DIR")
    TEMP_DIR: str = Field(default="./temp", env="TEMP_DIR")
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of {valid_levels}")
        return v.upper()
    
    @validator("STORAGE_TYPE")
    def validate_storage_type(cls, v):
        valid_types = ["local", "s3"]
        if v.lower() not in valid_types:
            raise ValueError(f"STORAGE_TYPE must be one of {valid_types}")
        return v.lower()
    
    @validator("DEFAULT_RENDER_QUALITY")
    def validate_render_quality(cls, v):
        valid_qualities = ["preview", "hd", "4k"]
        if v.lower() not in valid_qualities:
            raise ValueError(f"DEFAULT_RENDER_QUALITY must be one of {valid_qualities}")
        return v.lower()
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def get_redis_url() -> str:
    """Get Redis URL from settings."""
    return get_settings().REDIS_URL


def get_database_url() -> str:
    """Get database URL from settings."""
    return get_settings().DATABASE_URL


def is_debug() -> bool:
    """Check if application is in debug mode."""
    return get_settings().DEBUG


def get_max_text_length() -> int:
    """Get maximum allowed text length."""
    return get_settings().MAX_TEXT_LENGTH


def get_max_concurrent_jobs() -> int:
    """Get maximum concurrent jobs."""
    return get_settings().MAX_CONCURRENT_JOBS

