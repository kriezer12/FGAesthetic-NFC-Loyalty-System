"""
Accounts Management Routes
==========================

Endpoints for creating and managing user accounts.
Only accessible to super_admin and branch_admin users.
"""

from flask import Blueprint, request, jsonify
from gotrue.types import AdminUserAttributes
from app.services.supabase_client import get_supabase, get_supabase_admin
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
        "branch_id": "uuid"   # optional; only super_admin can set/change
        // full_name is optional; it can be supplied later via first-login onboarding
    }
    
    Returns:
    {
        "id": "user_id",
        "email": "user@example.com",
        "full_name": "",          # may be empty if not provided
        "role": "staff",
        "is_active": true,
        "branch_id": "uuid",      # may be null
        "branch_name": "some branch"  # may be null
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
        
        # authorization: branch_admin cannot create super_admin or branch_admin
        try:
            auth_client = get_supabase()
            caller_profile = get_supabase_admin().table('user_profiles').select('role').eq('id', admin_user_id).single().execute()
            caller_role = caller_profile.data.get('role') if caller_profile.data else None
            if caller_role == 'branch_admin' and data.get('role') != 'staff':
                return jsonify({'error': 'Branch admin may only create staff accounts'}), 403
        except Exception:
            pass

        try:
            supabase_admin = get_supabase_admin()
        except Exception as e:
            return jsonify({'error': f'Supabase connection failed: {str(e)}'}), 500

        # Create auth user
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

            # Wait a moment for trigger to fire
            import time
            time.sleep(0.5)

        except Exception as e:
            return jsonify({'error': f'Auth user creation failed: {str(e)}'}), 500

        # Upsert user profile with role, branch_id, first_login flag
        try:
            profile_payload = {
                'id': user_id,
                'email': data['email'],
                'full_name': data.get('full_name', ''),
                'role': data['role'],
                'is_active': True,
                'first_login': True,
            }
            if 'branch_id' in data:
                profile_payload['branch_id'] = data.get('branch_id')

            supabase_admin.table('user_profiles').upsert(profile_payload).execute()

        except Exception as e:
            return jsonify({'error': f'User profile creation failed: {str(e)}'}), 500

        # Build response
        user_resp = {
            'id': user_id,
            'email': data['email'],
            'full_name': data.get('full_name', ''),
            'role': data['role'],
            'is_active': True,
        }
        if 'branch_id' in data:
            user_resp['branch_id'] = data.get('branch_id')
            try:
                br = supabase_admin.table('branches').select('name').eq('id', data.get('branch_id')).single().execute()
                if br.data:
                    user_resp['branch_name'] = br.data.get('name')
            except Exception:
                pass

        return jsonify({'success': True, 'user': user_resp}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
                "branch_id": "uuid",
                "branch_name": "Makati",
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
        
        accounts = response.data
        # collect branch_ids and load names
        branch_ids = list({acc.get('branch_id') for acc in accounts if acc.get('branch_id')})
        branch_map = {}
        if branch_ids:
            br_resp = supabase.table('branches').select('id,name').in_('id', branch_ids).execute()
            if br_resp.data:
                branch_map = {b['id']: b['name'] for b in br_resp.data}
        # attach branch_name to each account
        for acc in accounts:
            if acc.get('branch_id'):
                acc['branch_name'] = branch_map.get(acc.get('branch_id'))
        
        return jsonify({
            'success': True,
            'accounts': accounts
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
        "is_active": true | false,
        "branch_id": "uuid"   # optional, only super_admin should supply
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
        
        # authorization check before modifying
        try:
            caller_id = get_user_from_token()
            caller_prof = get_supabase_admin().table('user_profiles').select('role').eq('id', caller_id).single().execute()
            caller_role = caller_prof.data.get('role') if caller_prof.data else None
            if caller_role == 'branch_admin':
                target_prof = get_supabase_admin().table('user_profiles').select('role').eq('id', user_id).single().execute()
                target_role = target_prof.data.get('role') if target_prof.data else None
                if target_role != 'staff':
                    return jsonify({'error': 'Branch admin may only edit staff accounts'}), 403
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception:
            pass
        
        supabase = get_supabase_admin()
        
        # Prepare update data
        update_data = {}
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'role' in data:
            update_data['role'] = data['role']
        if 'is_active' in data:
            update_data['is_active'] = data['is_active']
        if 'branch_id' in data:
            update_data['branch_id'] = data.get('branch_id')
        
        # Update user profile
        response = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({
                'error': 'Failed to update user'
            }), 500
        
        user_obj = response.data[0]
        # fetch branch_name if branch_id present
        if user_obj.get('branch_id'):
            try:
                br = supabase.table('branches').select('name').eq('id', user_obj.get('branch_id')).single().execute()
                if br.data:
                    user_obj['branch_name'] = br.data.get('name')
            except Exception:
                pass
        return jsonify({
            'success': True,
            'user': user_obj
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
