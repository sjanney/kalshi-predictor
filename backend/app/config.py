import os
from functools import lru_cache
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    def __init__(self):
        self.API_PORT = int(os.getenv("API_PORT", "8000"))
        
        # Parse CORS_ORIGINS from env (comma-separated) or default to ["*"]
        cors_origins_str = os.getenv("CORS_ORIGINS", "*")
        if cors_origins_str == "*":
            self.CORS_ORIGINS = ["*"]
        else:
            self.CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(",")]
        
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        
        self.KALSHI_API_BASE_URL = os.getenv("KALSHI_API_BASE_URL", "https://api.elections.kalshi.com")
        self.KALSHI_API_KEY_ID = os.getenv("KALSHI_API_KEY_ID", "0b3ab9ef-d8e0-4b83-8f1e-8cd84f33a89b")
        self.KALSHI_PRIVATE_KEY_PATH = os.getenv("KALSHI_PRIVATE_KEY_PATH", "prediction_api_key.txt")
        self.KALSHI_API_KEY = os.getenv("KALSHI_API_KEY", "")
        self.USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
        
        # App metadata
        self.PROJECT_NAME = "Kalshi Predictor API"
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

@lru_cache()
def get_settings():
    return Settings()
