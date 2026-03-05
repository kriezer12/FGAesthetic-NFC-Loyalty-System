"""
Accounts Management Routes
==========================

Endpoints for creating and managing user accounts.
Only accessible to super_admin and branch_admin users.
"""

from flask import Blueprint, request, jsonify
from gotrue.types import AdminUserAttributes
from app.services.supabase_client import get_supabase_admin

accounts_bp = Blueprint('accounts', __name__, url_prefix='/api/accounts')


@accounts_bp.route('/create', methods=['POST'])
def create_account():
    """
    Create a new user account.
    
    Request body:
    {
        "email": "user@example.com",
        "password": "secure_password",
        "full_name": "John Doe",
        "role": "staff" | "branch_admin" | "super_admin"
    }
    
    Returns:
    {
        "id": "user_id",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "staff",
        "is_active": true
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Request body must be valid JSON'
            }), 400
        
        # Validate required fields
        required_fields = ['email', 'password', 'full_name', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400
        
        try:
            supabase = get_supabase_admin()
        except Exception as e:
            return jsonify({
                'error': f'Supabase connection failed: {str(e)}'
            }), 500
        
        # Create auth user using admin API
        try:
            user_response = supabase.auth.admin.create_user(
                AdminUserAttributes(
                    email=data['email'],
                    password=data['password'],
                    email_confirm=True,
                    user_metadata={'full_name': data['full_name']},
                )
            )
            
            if not user_response.user:
                return jsonify({
                    'error': 'Failed to create auth user'
                }), 500
            
            user_id = user_response.user.id
        except Exception as e:
            return jsonify({
                'error': f'Auth user creation failed: {str(e)}'
            }), 500
        
        # Create user profile
        try:
            profile_response = supabase.table('user_profiles').upsert({
                'id': user_id,
                'email': data['email'],
                'full_name': data['full_name'],
                'role': data['role'],
                'is_active': True,
            }).execute()
            
            if not profile_response.data:
                return jsonify({
                    'error': 'Failed to create user profile'
                }), 500
        except Exception as e:
            return jsonify({
                'error': f'User profile creation failed: {str(e)}'
            }), 500
        
        return jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'email': data['email'],
                'full_name': data['full_name'],
                'role': data['role'],
                'is_active': True
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500
