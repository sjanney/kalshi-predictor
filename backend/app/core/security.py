import base64
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger(__name__)

PUBLIC_KEY_PATH = Path("public_key.pem")
LICENSE_FILE_PATH = Path("license.key")

class LicenseManager:
    def __init__(self, public_key_path: Path = PUBLIC_KEY_PATH):
        self.public_key_path = public_key_path
        self._public_key = None
        self.is_active = False  # Cache license status
        self.license_data = None # Cache license details
        self._load_public_key()

    def _load_public_key(self):
        """Load the public key from disk."""
        # Try multiple paths
        paths_to_try = [
            self.public_key_path,
            Path("backend") / self.public_key_path,
            Path(__file__).parent.parent.parent / "public_key.pem", # backend/public_key.pem
            Path("/app/public_key.pem"), # Docker
        ]
        
        found_path = None
        for p in paths_to_try:
            if p.exists():
                found_path = p
                break
        
        if not found_path:
            logger.warning(f"Public key not found. Searched: {[str(p) for p in paths_to_try]}")
            return

        try:
            with open(found_path, "rb") as key_file:
                self._public_key = serialization.load_pem_public_key(
                    key_file.read()
                )
            logger.info(f"Loaded public key from {found_path}")
        except Exception as e:
            logger.error(f"Failed to load public key: {e}")

    def verify_license(self, license_key: str) -> Optional[Dict[str, Any]]:
        """
        Verify the license key.
        Returns the license data if valid, None otherwise.
        Updates self.is_active.
        """
        # Lazy load if not loaded
        if not self._public_key:
            self._load_public_key()
            
        if not self._public_key:
            logger.error("Public key not loaded. Cannot verify license.")
            return None

        try:
            # Decode the license key (base64)
            decoded = base64.b64decode(license_key)
            
            # Split signature and data (assuming fixed length signature or separator)
            license_obj = json.loads(decoded)
            
            data_str = json.dumps(license_obj['data'], sort_keys=True)
            signature = base64.b64decode(license_obj['signature'])
            
            # Verify signature
            self._public_key.verify(
                signature,
                data_str.encode('utf-8'),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Check expiry if present
            if license_obj['data'].get('expiry'):
                # Add expiry check logic here
                pass
            
            self.is_active = True
            self.license_data = license_obj['data']
            return license_obj['data']

        except (json.JSONDecodeError, KeyError, ValueError):
            logger.error("Invalid license format.")
            self.is_active = False
            return None
        except InvalidSignature:
            logger.error("Invalid license signature.")
            self.is_active = False
            return None
        except Exception as e:
            logger.error(f"License verification error: {e}")
            self.is_active = False
            return None

    def load_and_verify_stored_license(self) -> bool:
        """Load license from file and verify it."""
        paths_to_try = [
            Path("license.key"),
            Path("backend/license.key"),
            Path(__file__).parent.parent.parent / "license.key",
        ]
        
        found_path = None
        for p in paths_to_try:
            if p.exists():
                found_path = p
                break
                
        if not found_path:
            self.is_active = False
            return False
            
        try:
            with open(found_path, "r") as f:
                license_key = f.read().strip()
            result = self.verify_license(license_key) is not None
            return result
        except Exception:
            self.is_active = False
            return False

license_manager = LicenseManager()
