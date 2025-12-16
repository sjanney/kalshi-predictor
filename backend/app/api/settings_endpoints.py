"""
Settings API endpoints for user configuration.
"""
import os
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])

# Path where user's private key will be stored
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
USER_PRIVATE_KEY_PATH = DATA_DIR / "user_private_key.pem"


class PrivateKeyRequest(BaseModel):
    private_key: str


class PrivateKeyStatus(BaseModel):
    configured: bool
    path: str


@router.post("/private-key")
async def save_private_key(request: PrivateKeyRequest):
    """
    Save user's RSA private key for Kalshi API authentication.
    """
    key_content = request.private_key.strip()
    
    # Basic validation
    if not key_content:
        raise HTTPException(status_code=400, detail="Private key cannot be empty")
    
    if "-----BEGIN RSA PRIVATE KEY-----" not in key_content:
        raise HTTPException(
            status_code=400, 
            detail="Invalid key format. Key must start with '-----BEGIN RSA PRIVATE KEY-----'"
        )
    
    if "-----END RSA PRIVATE KEY-----" not in key_content:
        raise HTTPException(
            status_code=400, 
            detail="Invalid key format. Key must end with '-----END RSA PRIVATE KEY-----'"
        )
    
    try:
        # Ensure data directory exists
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write key to file
        with open(USER_PRIVATE_KEY_PATH, "w") as f:
            f.write(key_content)
            if not key_content.endswith("\n"):
                f.write("\n")
        
        # Set restrictive permissions (owner read/write only)
        os.chmod(USER_PRIVATE_KEY_PATH, 0o600)
        
        logger.info(f"✅ User private key saved to {USER_PRIVATE_KEY_PATH}")
        
        return {
            "success": True,
            "message": "Private key saved successfully",
            "path": str(USER_PRIVATE_KEY_PATH)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to save private key: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save private key: {str(e)}")


@router.get("/private-key/status", response_model=PrivateKeyStatus)
async def get_private_key_status():
    """
    Check if a user private key is configured.
    """
    configured = USER_PRIVATE_KEY_PATH.exists()
    
    return PrivateKeyStatus(
        configured=configured,
        path=str(USER_PRIVATE_KEY_PATH) if configured else ""
    )


@router.delete("/private-key")
async def delete_private_key():
    """
    Delete the user's configured private key.
    """
    if USER_PRIVATE_KEY_PATH.exists():
        try:
            USER_PRIVATE_KEY_PATH.unlink()
            logger.info("🗑️ User private key deleted")
            return {"success": True, "message": "Private key deleted"}
        except Exception as e:
            logger.error(f"❌ Failed to delete private key: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")
    else:
        return {"success": True, "message": "No private key was configured"}
