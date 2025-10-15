"""
SignSynth FastAPI Application
Main application entry point with all routes and middleware configuration.
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog
import uvicorn

from app.core.config import get_settings
from app.core.auth import setup_auth
from app.api.v1 import generate, jobs, health
from app.core.database import init_db
from app.core.websocket import websocket_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info("Starting SignSynth application")
    settings = get_settings()
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Setup authentication
    setup_auth()
    logger.info("Authentication configured")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SignSynth application")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="SignSynth API",
        description="Realistic Text to Sign Language Video Generation",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    # In debug mode allow all origins to avoid WebSocket handshake 403 during local development.
    if settings.DEBUG:
        # Be permissive in dev to avoid origin mismatches from localhost ports
        allow_origins = ["*"]
    else:
        # In production, use configured origins
        allow_origins = settings.CORS_ORIGINS

    # Log the effective CORS origins for troubleshooting
    logger.info("CORS origins", origins=allow_origins, debug_mode=settings.DEBUG)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add trusted host middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
    )
    
    # Add request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        logger.info(
            "Request processed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            process_time=process_time
        )
        
        return response
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            exc_info=exc,
            method=request.method,
            url=str(request.url)
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    # Include routers
    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(generate.router, prefix="/api/v1", tags=["generate"])
    app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
    app.include_router(websocket_router, prefix="/ws", tags=["websocket"])
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint with basic API information."""
        return {
            "message": "SignSynth API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs" if settings.DEBUG else "disabled"
        }
    
    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import time
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )

