import argparse
import json
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from pathlib import Path

def generate_license(name: str, email: str, expiry: str = None):
    """Generate a signed license key."""
    
    if not Path("private_key.pem").exists():
        print("Error: private_key.pem not found. Run generate_keys.py first.")
        return

    # Load private key
    with open("private_key.pem", "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )

    # Prepare license data
    license_data = {
        "name": name,
        "email": email,
        "expiry": expiry, # ISO format date or None for lifetime
        "type": "pro"
    }
    
    data_str = json.dumps(license_data, sort_keys=True)
    
    # Sign data
    signature = private_key.sign(
        data_str.encode('utf-8'),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    # Create license object
    license_obj = {
        "data": license_data,
        "signature": base64.b64encode(signature).decode('utf-8')
    }
    
    # Encode final key
    license_key = base64.b64encode(json.dumps(license_obj).encode('utf-8')).decode('utf-8')
    
    print(f"\nGenerated License Key for {name}:\n")
    print(license_key)
    print("\nSave this key to a file named 'license.key' in the app directory.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a license key.")
    parser.add_argument("--name", required=True, help="User's name")
    parser.add_argument("--email", required=True, help="User's email")
    parser.add_argument("--expiry", help="Expiry date (YYYY-MM-DD)")
    
    args = parser.parse_args()
    generate_license(args.name, args.email, args.expiry)
