"""
Configuration Module
====================

Loads environment variables and provides configuration settings
for the Flask application.

Required Environment Variables:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase anon/service key
- FRONTEND_URL: Frontend URL for CORS (default: http://localhost:5173)
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """
    Application configuration class.
    
    All settings are loaded from environment variables for security.
    """
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Frontend URL for CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


# Global config instance
config = Config()
