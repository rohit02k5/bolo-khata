import sys
from pathlib import Path

_VENDOR = Path(__file__).resolve().parent / "app" / "vendor"
sys.path.insert(0, str(_VENDOR))
