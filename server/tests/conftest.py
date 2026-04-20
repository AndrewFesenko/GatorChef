import sys
from pathlib import Path

# Allow `from app.services...` imports when running pytest from the server/ dir.
_SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVER_ROOT))
