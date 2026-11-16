import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "PSX Signal Intelligence"
    API_V1_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "*"
    ]
    DATA_MODE: str = os.getenv("DATA_MODE", "MOCK") # MOCK or LIVE
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    MOCK_DISCLAIMER: str = "SIMULATED / MOCK RESEARCH DATA FOR UI DEVELOPMENT - NOT LIVE PSX DATA"

settings = Settings()
