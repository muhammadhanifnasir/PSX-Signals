import os
import sys

# Ensure root workspace is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.PROJECT_NAME} backend on {settings.HOST}:{settings.PORT}...")
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
