import os
import sys

# Ensure repository root is in sys.path
_root = os.path.dirname(os.path.abspath(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)

from backend.main import app

__all__ = ["app"]
