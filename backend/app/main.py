import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import get_settings

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME, version="3.0.0")

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

from app.startup import run_startup_tasks

# Import API routers
from app.api.endpoints import router as api_router
from app.api.enhanced_endpoints import router as enhanced_router
from app.api.training_endpoints import router as training_router

# Run startup tasks (initialize Elo ratings, etc.)
run_startup_tasks()

app.include_router(api_router, prefix="/api")
app.include_router(enhanced_router, prefix="/api")
app.include_router(training_router, prefix="/api")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": f"{settings.PROJECT_NAME} is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
