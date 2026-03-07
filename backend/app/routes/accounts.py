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
        "role": "staff" | "branch_admin" | "super_admin",
        // full_name is optional; it can be supplied later via first-login onboarding
    }
    
    Returns:
    {
        "id": "user_id",
        "email": "user@example.com",
        "full_name": "",          # may be empty if not provided
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
        
        # Validate required fields (full_name is optional)
        required_fields = ['email', 'role']
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
        
        # Create auth user using admin API with default password
        try:
            # Use default password "password" for new accounts
            default_password = "password"
            user_response = supabase.auth.admin.create_user(
                AdminUserAttributes(
                    email=data['email'],
                    password=default_password,
                    email_confirm=True,
                    user_metadata={'full_name': data.get('full_name', '')},
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
                'full_name': data.get('full_name', ''),
                'role': data['role'],
                'is_active': True,
                'first_login': True,  # Flag to indicate this is the first login
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
                'full_name': data.get('full_name', ''),
                'role': data['role'],
                'is_active': True
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@accounts_bp.route('/list', methods=['GET'])
def list_accounts():
    """
    Get all user accounts.
    
    Returns:
    {
        "accounts": [
            {
                "id": "user_id",
                "email": "user@example.com",
                "full_name": "User Name",
                "role": "staff",
                "is_active": true,
                "created_at": "2024-01-01T00:00:00Z"
            },
            ...
        ]
    }
    """
    try:
        supabase = get_supabase_admin()
        
        # Fetch all user profiles
        response = supabase.table('user_profiles').select('*').execute()
        
        if not response.data:
            return jsonify({
                'accounts': []
            }), 200
        
        return jsonify({
            'success': True,
            'accounts': response.data
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to fetch accounts: {str(e)}'
        }), 500


@accounts_bp.route('/<user_id>', methods=['PUT'])
def update_account(user_id):
    """
    Update a user account.
    
    Request body:
    {
        "full_name": "New Name",
        "role": "staff" | "branch_admin" | "super_admin",
        "is_active": true | false
    }
    
    Returns:
    {
        "success": true,
        "user": { updated user data }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Request body must be valid JSON'
            }), 400
        
        supabase = get_supabase_admin()
        
        # Prepare update data
        update_data = {}
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'role' in data:
            update_data['role'] = data['role']
        if 'is_active' in data:
            update_data['is_active'] = data['is_active']
        
        # Update user profile
        response = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({
                'error': 'Failed to update user'
            }), 500
        
        return jsonify({
            'success': True,
            'user': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Update failed: {str(e)}'
        }), 500


@accounts_bp.route('/<user_id>', methods=['DELETE'])
def delete_account(user_id):
    """
    Delete a user account.
    
    Returns:
    {
        "success": true,
        "message": "Account deleted successfully"
    }
    """
    try:
        supabase = get_supabase_admin()
        
        # Delete user auth record using admin API
        supabase.auth.admin.delete_user(user_id)
        
        # Delete user profile
        supabase.table('user_profiles').delete().eq('id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Account deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Delete failed: {str(e)}'
        }), 500
