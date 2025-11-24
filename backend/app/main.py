from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="NBA Game Predictor", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import router as api_router
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "NBA Game Predictor API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
