import sys
import os
from pathlib import Path
import json
import base64
from datetime import datetime, timedelta
import argparse

# Add backend to path
sys.path.append(str(Path.cwd() / "backend"))

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
    from rich.layout import Layout
    from rich.align import Align
    from rich.text import Text
    from rich import print as rprint
except ImportError:
    print("Please install 'rich' library: pip install rich")
    sys.exit(1)

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

console = Console()

def load_private_key(key_path: Path):
    if not key_path.exists():
        console.print(f"[red]Error: Private key not found at {key_path}[/red]")
        return None
    
    try:
        with open(key_path, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None
            )
        return private_key
    except Exception as e:
        console.print(f"[red]Error loading private key: {e}[/red]")
        return None

def generate_license_key(private_key, name, email, expiry_days=None, license_type="pro"):
    data = {
        "name": name,
        "email": email,
        "type": license_type,
        "created_at": datetime.utcnow().isoformat(),
        "expiry": (datetime.utcnow() + timedelta(days=expiry_days)).isoformat() if expiry_days else None
    }
    
    data_str = json.dumps(data, sort_keys=True)
    
    signature = private_key.sign(
        data_str.encode('utf-8'),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    license_obj = {
        "data": data,
        "signature": base64.b64encode(signature).decode('utf-8')
    }
    
    return base64.b64encode(json.dumps(license_obj).encode('utf-8')).decode('utf-8')

def main():
    console.clear()
    
    # Header
    header = Panel(
        Align.center(
            Text("Kalshi Predictor\nLicense Generator", style="bold cyan", justify="center")
        ),
        border_style="cyan",
        subtitle="v1.0"
    )
    console.print(header)
    console.print()

    # Check for keys
    key_path = Path("backend/private_key.pem")
    if not key_path.exists():
        console.print("[yellow]Warning: Private key not found in default location.[/yellow]")
        if Confirm.ask("Would you like to generate new keys?"):
            # Import key generation logic or run script
            console.print("[blue]Generating keys...[/blue]")
            os.system("python3 backend/scripts/generate_keys.py")
            console.print("[green]Keys generated![/green]")
        else:
            console.print("[red]Cannot proceed without private key.[/red]")
            return

    private_key = load_private_key(key_path)
    if not private_key:
        return

    # Input Form
    console.print("[bold white]Enter Customer Details:[/bold white]")
    
    name = Prompt.ask("Name", default="User")
    email = Prompt.ask("Email")
    license_type = Prompt.ask("License Type", choices=["pro", "enterprise", "trial", "lifetime"], default="pro")
    
    expiry_str = Prompt.ask("Expiry (days or 'lifetime')", default="365")
    expiry_days = int(expiry_str) if expiry_str.lower() not in ["forever", "lifetime"] else None

    with console.status("[bold green]Generating License...[/bold green]"):
        license_key = generate_license_key(private_key, name, email, expiry_days, license_type)
        
    console.print()
    console.print(Panel(
        Align.center(
            Text(license_key, style="bold green")
        ),
        title="Generated License Key",
        border_style="green"
    ))
    
    console.print()
    console.print("[bold white]Raw License Key (Copy this):[/bold white]")
    console.print(license_key, style="green")
    console.print()
    
    if Confirm.ask("Save to file?"):
        filename = Prompt.ask("Filename", default="license.key")
        with open(filename, "w") as f:
            f.write(license_key)
        console.print(f"[green]Saved to {filename}[/green]")

if __name__ == "__main__":
    main()
