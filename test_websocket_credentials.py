#!/usr/bin/env python3
"""
Quick test to verify WebSocket credentials are loaded correctly
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.config import get_settings
from app.services.kalshi_websocket import KalshiWebSocketService

def test_credentials():
    print("🔍 Testing WebSocket Credential Loading...\n")
    
    # Test settings
    settings = get_settings()
    print(f"✓ KALSHI_API_KEY_ID: {settings.KALSHI_API_KEY_ID}")
    print(f"✓ KALSHI_API_KEY: {settings.KALSHI_API_KEY}")
    print(f"✓ KALSHI_PRIVATE_KEY_PATH: {settings.KALSHI_PRIVATE_KEY_PATH}")
    
    # Test WebSocket service initialization
    print("\n🔌 Initializing WebSocket Service...")
    ws_service = KalshiWebSocketService()
    
    # Check credentials loaded
    if ws_service.api_key_id:
        print(f"✅ API Key ID loaded: {ws_service.api_key_id}")
    else:
        print("❌ API Key ID NOT loaded")
        return False
    
    if ws_service._private_key:
        print("✅ Private key loaded successfully")
    else:
        print("❌ Private key NOT loaded")
        return False
    
    # Test auth header generation
    print("\n🔐 Testing Auth Header Generation...")
    auth_headers = ws_service._create_auth_headers()
    
    if auth_headers:
        print("✅ Auth headers generated successfully:")
        print(f"   - KALSHI-ACCESS-KEY: {auth_headers.get('KALSHI-ACCESS-KEY')}")
        print(f"   - KALSHI-ACCESS-TIMESTAMP: {auth_headers.get('KALSHI-ACCESS-TIMESTAMP')}")
        print(f"   - KALSHI-ACCESS-SIGNATURE: {auth_headers.get('KALSHI-ACCESS-SIGNATURE')[:50]}...")
        print("\n✅ All credential checks passed!")
        print("🚀 WebSocket should connect successfully")
        return True
    else:
        print("❌ Failed to generate auth headers")
        return False

if __name__ == "__main__":
    success = test_credentials()
    sys.exit(0 if success else 1)
