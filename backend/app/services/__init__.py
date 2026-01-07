"""
Services Module
===============

Contains business logic and external service integrations.

Available Services:
- supabase_client: Supabase database client
"""

from app.services.supabase_client import get_supabase

__all__ = ["get_supabase"]
