"""
Authentication and authorization utilities for SignSynth API.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

# Security configuration
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning("Token verification failed", error=str(e))
        return None


def verify_api_key(api_key: str) -> bool:
    """Verify API key against configured key."""
    settings = get_settings()
    if not api_key:
        return False
    return api_key == settings.API_KEY


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token."""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def verify_api_key_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> bool:
    """Verify API key authentication.

    This dependency accepts either a Bearer token in the Authorization header
    or an API key provided in the X-API-Key header. Frontend code commonly
    sends `x-api-key: <key>` so we support that for convenience.
    """
    # First, check for X-API-Key header (case-insensitive)
    api_key_header = None
    if request is not None:
        api_key_header = request.headers.get("x-api-key") or request.headers.get("X-API-Key")

    # If x-api-key header present, validate it
    if api_key_header:
        if verify_api_key(api_key_header):
            return True
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    # Fallback: use Authorization Bearer token
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
        # If the API key is being sent in the bearer token (legacy), accept it too
        if verify_api_key(token):
            return True

        # Otherwise validate as JWT
        payload = verify_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return True

    # No valid credential found
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def setup_auth():
    """Setup authentication configuration."""
    logger.info("Authentication system initialized")


# Rate limiting utilities
from collections import defaultdict
from datetime import datetime, timedelta
import time

# Simple in-memory rate limiter (in production, use Redis)
_rate_limit_storage = defaultdict(list)


def check_rate_limit(identifier: str, limit: int, window: int) -> bool:
    """
    Check if request is within rate limit.
    
    Args:
        identifier: Unique identifier (IP, user ID, etc.)
        limit: Maximum requests allowed
        window: Time window in seconds
    
    Returns:
        True if within limit, False if rate limited
    """
    now = time.time()
    window_start = now - window
    
    # Clean old entries
    _rate_limit_storage[identifier] = [
        timestamp for timestamp in _rate_limit_storage[identifier]
        if timestamp > window_start
    ]
    
    # Check if within limit
    if len(_rate_limit_storage[identifier]) >= limit:
        return False
    
    # Add current request
    _rate_limit_storage[identifier].append(now)
    return True


def get_rate_limit_info(identifier: str, limit: int, window: int) -> Dict[str, Any]:
    """Get rate limit information for an identifier."""
    now = time.time()
    window_start = now - window
    
    # Clean old entries
    _rate_limit_storage[identifier] = [
        timestamp for timestamp in _rate_limit_storage[identifier]
        if timestamp > window_start
    ]
    
    return {
        "limit": limit,
        "remaining": max(0, limit - len(_rate_limit_storage[identifier])),
        "reset_time": window_start + window,
        "current_requests": len(_rate_limit_storage[identifier])
    }

