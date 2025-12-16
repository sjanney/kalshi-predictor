import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import get_settings

settings = get_settings()

from app.core.logging import setup_logging
from app.core.database import db_manager
from app.core.security import license_manager

# Configure logging
logger = setup_logging()

# WebSocket service lifecycle
from app.services.kalshi_websocket import get_websocket_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    logger.info("🚀 Starting application...")
    
    # Initialize Database
    try:
        db_manager._init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
    
    # Check License
    if license_manager.load_and_verify_stored_license():
        logger.info("✅ Valid license found.")
    else:
        logger.warning("⚠️ No valid license found. Application running in restricted/dev mode.")
        # In a real production app, you might raise an exception here to stop startup
        # raise RuntimeError("Invalid License")

    ws_service = get_websocket_service()
    await ws_service.start()
    logger.info("✅ WebSocket service started")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application...")
    await ws_service.stop()
    logger.info("✅ WebSocket service stopped")

app = FastAPI(title=settings.PROJECT_NAME, version="3.0.0", lifespan=lifespan)

from fastapi import Request
from fastapi.responses import JSONResponse

# Add compression middleware (should be before CORS)
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def check_license(request: Request, call_next):
    """
    Middleware to enforce license check.
    Blocks access to API endpoints if license is invalid.
    Allows access to license management endpoints and health checks.
    """
    # Allow health check, root, and license management
    if request.url.path in ["/", "/health", "/docs", "/openapi.json"] or request.url.path.startswith("/api/license"):
        return await call_next(request)
    
    # Check if license is active
    if not license_manager.is_active:
        return JSONResponse(
            status_code=403,
            content={
                "detail": "License invalid or missing. Please activate your product.",
                "code": "LICENSE_REQUIRED"
            }
        )
        
    return await call_next(request)

from app.startup import run_startup_tasks

# Import API routers
from app.api.endpoints import router as api_router
from app.api.enhanced_endpoints import router as enhanced_router
from app.api.training_endpoints import router as training_router
from app.api.websocket_endpoints import router as websocket_router
from app.api.trading_endpoints import router as trading_router

# Run startup tasks (initialize Elo ratings, etc.)
run_startup_tasks()

app.include_router(api_router, prefix="/api")
app.include_router(enhanced_router, prefix="/api")
app.include_router(training_router, prefix="/api")
app.include_router(trading_router, prefix="/api")
app.include_router(websocket_router)

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": f"{settings.PROJECT_NAME} is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
