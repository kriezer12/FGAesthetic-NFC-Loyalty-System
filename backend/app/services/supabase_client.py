"""
Supabase Client Module
======================

Provides a singleton Supabase client instance for database operations.
The client is lazily initialized on first use.

Usage:
    from app.services.supabase_client import get_supabase
    
    supabase = get_supabase()
    result = supabase.table('users').select('*').execute()
"""

from supabase import create_client, Client
from app.config import config

# Singleton instance
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """
    Get or initialize the Supabase client.
    
    Returns:
        Client: Initialized Supabase client instance.
        
    Raises:
        Exception: If SUPABASE_URL or SUPABASE_KEY are not set.
    """
    global _supabase_client
    
    if _supabase_client is None:
        # Validate required environment variables
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            raise Exception(
                "SUPABASE_URL and SUPABASE_KEY must be set in .env file"
            )
        
        # Initialize the client
        _supabase_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_KEY
        )
    
    return _supabase_client