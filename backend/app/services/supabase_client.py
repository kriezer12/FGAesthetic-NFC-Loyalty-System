from supabase import create_client, Client
from app.config import config

_supabase_client = None

def get_supabase() -> Client:
    """Get or initialize Supabase client"""
    global _supabase_client
    
    if _supabase_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            raise Exception("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        
        _supabase_client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    
    return _supabase_client