import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


config = Config()
