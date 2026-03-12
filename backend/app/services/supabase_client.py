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

import sys
from supabase import create_client, Client
from app.config import config

# Singleton instances
_supabase_client: Client | None = None
_supabase_admin_client: Client | None = None


def get_supabase() -> Client:
    """
    Get or initialize the Supabase client (anon/publishable key).
    Suitable for standard database reads/writes subject to RLS.
    
    Returns:
        Client: Initialized Supabase client instance.
        
    Raises:
        Exception: If SUPABASE_URL or SUPABASE_KEY are not set.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            error_msg = "SUPABASE_URL and SUPABASE_KEY must be set in .env file"
            print(f"[SUPABASE ERROR] {error_msg}", file=sys.stderr)
            raise Exception(error_msg)
        
        print("[SUPABASE] Initializing client with anon key...", file=sys.stderr)
        _supabase_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_KEY
        )
    
    return _supabase_client


def get_supabase_admin() -> Client:
    """
    Get or initialize the Supabase admin client (service_role key).
    Required for auth.admin operations such as creating/deleting users.
    
    Returns:
        Client: Initialized Supabase admin client instance.
        
    Raises:
        Exception: If SUPABASE_URL or SUPABASE_SERVICE_KEY are not set.
    """
    global _supabase_admin_client
    
    if _supabase_admin_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
            error_msg = (
                "SUPABASE_SERVICE_KEY must be set in .env file. "
                "Find it in Supabase Dashboard → Project Settings → API → service_role key."
            )
            print(f"[SUPABASE ERROR] {error_msg}", file=sys.stderr)
            raise Exception(error_msg)
        
        print("[SUPABASE] Initializing admin client with service_role key...", file=sys.stderr)
        _supabase_admin_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_KEY
        )
    
    return _supabase_admin_client