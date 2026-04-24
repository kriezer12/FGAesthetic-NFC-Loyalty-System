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
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)


class Config:
    """
    Application configuration class.
    
    All settings are loaded from environment variables for security.
    """
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Frontend URL for CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    def validate(self) -> bool:
        """
        Validate that all required environment variables are set.
        WARNING: Missing Supabase credentials will cause API endpoints to fail!
        """
        missing = []
        
        if not self.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not self.SUPABASE_KEY:
            missing.append("SUPABASE_KEY")
        if not self.SUPABASE_SERVICE_KEY:
            missing.append("SUPABASE_SERVICE_KEY")
        
        if missing:
            warning = f"⚠️  WARNING: Missing required environment variables: {', '.join(missing)}"
            warning += "\n   API endpoints that use Supabase will fail!"
            warning += "\n   Make sure .env file exists in the project root with these variables."
            print(warning, file=sys.stderr)
            return False
        
        return True


# Global config instance
config = Config()
