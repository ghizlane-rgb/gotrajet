"""Start the GOTRAJET server locally: python backend/run.py  →  http://127.0.0.1:8000"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

import uvicorn  # noqa: E402

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload="--reload" in sys.argv,
    )
