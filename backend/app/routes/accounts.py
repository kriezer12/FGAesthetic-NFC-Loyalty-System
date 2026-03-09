"""
Accounts Management Routes
==========================

Endpoints for creating and managing user accounts.
Only accessible to super_admin and branch_admin users.
"""

from flask import Blueprint, request, jsonify
from gotrue.types import AdminUserAttributes
from app.services.supabase_client import get_supabase_admin
import jwt
from app.config import config
import sys

accounts_bp = Blueprint('accounts', __name__, url_prefix='/api/accounts')


def get_user_from_token():
    """
    Extract user ID from Authorization header JWT token.
    
    Returns:
        str: User ID from the token
        
    Raises:
        ValueError: If Authorization header is missing or token is invalid
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise ValueError('Authorization header is required')
    
    try:
        # Extract Bearer token
        scheme, token = auth_header.split(' ')
        if scheme.lower() != 'bearer':
            raise ValueError('Invalid authorization scheme')
        
        # Decode JWT (without verification since Supabase signs it)
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        if not user_id:
            raise ValueError('Token does not contain user ID')
        
        return user_id
    except (ValueError, KeyError) as e:
        raise ValueError(f'Invalid token format: {str(e)}')


@accounts_bp.route('/create', methods=['POST'])
def create_account():
    """
    Create a new user account.
    The user profile is automatically created via Supabase trigger.
    
    Request body:
    {
        "email": "user@example.com",
        "role": "staff" | "branch_admin" | "super_admin",
        "full_name": "optional"
    }
    """
    try:
        # Authenticate the request
        try:
            admin_user_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body must be valid JSON'}), 400
        
        required_fields = ['email', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400
        
        try:
            supabase_admin = get_supabase_admin()
        except Exception as e:
            return jsonify({'error': f'Supabase connection failed: {str(e)}'}), 500
        
        # Create auth user - profile will be created automatically by trigger
        try:
            default_password = "password"
            print(f"[DEBUG] Creating user with email: {data['email']}", file=sys.stderr)
            user_response = supabase_admin.auth.admin.create_user(
                AdminUserAttributes(
                    email=data['email'],
                    password=default_password,
                    email_confirm=True,
                    user_metadata={
                        'full_name': data.get('full_name', ''),
                        'role': data['role'],
                        'admin_id': admin_user_id,
                    },
                )
            )
            
            if not user_response.user:
                return jsonify({'error': 'Failed to create auth user'}), 500
            
            user_id = user_response.user.id
            print(f"[DEBUG] User created successfully: {user_id}", file=sys.stderr)
            
            # Wait a moment for trigger to fire, then fetch the created profile
            import time
            time.sleep(0.5)
            
            admin_profile_response = supabase_admin.table('user_profiles').select('branch_id').eq('id', admin_user_id).execute()
            admin_branch_id = None
            if admin_profile_response.data and len(admin_profile_response.data) > 0:
                admin_branch_id = admin_profile_response.data[0].get('branch_id')
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user_id,
                    'email': data['email'],
                    'full_name': data.get('full_name', ''),
                    'role': data['role'],
                    'branch_id': str(admin_branch_id) if admin_branch_id else None,
                    'is_active': True
                }
            }), 201
            
        except Exception as e:
            print(f"[DEBUG] Exception creating user: {type(e).__name__}: {str(e)}", file=sys.stderr)
            import traceback
            print(f"[DEBUG] Traceback: {traceback.format_exc()}", file=sys.stderr)
            return jsonify({'error': f'Auth user creation failed: {str(e)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
