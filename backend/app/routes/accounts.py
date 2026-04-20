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
        # Extract Bearer token, handling potential extra spaces
        parts = auth_header.split()
        if len(parts) != 2:
            raise ValueError('Invalid authorization header format')
        
        scheme, token = parts
        if scheme.lower() != 'bearer':
            raise ValueError('Invalid authorization scheme')
        
        if not token or token.strip() == '':
            raise ValueError('Token cannot be empty')
        
        # Decode JWT (without verification since Supabase signs it)
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
        except Exception as decode_err:
            raise ValueError(f'Invalid token format: {str(decode_err)}')
        
        user_id = decoded.get('sub')
        if not user_id:
            raise ValueError('Token does not contain user ID')
        
        return user_id
    except ValueError as ve:
        # Re-raise ValueError as-is
        raise ve
    except Exception as e:
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
            supabase_admin = get_supabase_admin()
            caller_profile = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', admin_user_id).single().execute()
            caller_role = caller_profile.data.get('role') if caller_profile.data else None
            caller_branch_id = caller_profile.data.get('branch_id')

            if caller_role == 'branch_admin':
                if data.get('role') != 'staff':
                    return jsonify({'error': 'Branch admin may only create staff accounts'}), 403
                
                # Force branch_id to be same as admin's
                if not caller_branch_id:
                    return jsonify({'error': 'Branch admin must have an assigned branch to create accounts'}), 403
                
                data['branch_id'] = caller_branch_id
            elif caller_role != 'super_admin':
                return jsonify({'error': 'Unauthorized: Insufficient permissions'}), 403
        except Exception as e:
            return jsonify({'error': f'Auth check failed: {str(e)}'}), 500

        try:
            supabase_admin = get_supabase_admin()
        except Exception as e:
            return jsonify({'error': f'Supabase connection failed: {str(e)}'}), 500

        # Create auth user
        try:
            default_password = "password"
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
    Get user accounts.
    - super_admin: sees all accounts
    - branch_admin: sees only accounts in their branch
    """
    try:
        # Authenticate and get caller info
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        
        # Get caller's profile to check role and branch
        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404
            
        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')
        
        # Build query based on role
        query = supabase.table('user_profiles').select('*')
        
        if caller_role == 'branch_admin':
            if not caller_branch_id:
                # Branch admin without a branch assigned
                return jsonify({'success': True, 'accounts': []}), 200
            query = query.eq('branch_id', caller_branch_id)
        elif caller_role != 'super_admin':
            # Other roles (e.g. staff) are not authorized to list accounts
            return jsonify({'error': 'Unauthorized: Insufficient permissions'}), 403
            
        # Check status query parameter
        status_param = request.args.get('status', 'active')
        
        # Filter accounts based on status parameter
        if status_param == 'active':
            query = query.eq('is_active', True)
        elif status_param == 'deleted':
            query = query.eq('is_active', False).not_.is_null('deleted_at')
        elif status_param == 'all':
            # No filtering by is_active needed
            pass
        
        # Fetch filtered user profiles
        response = query.execute()
        
        if not response.data:
            return jsonify({
                'success': True,
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
            supabase_admin = get_supabase_admin()
            caller_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
            caller_role = caller_prof.data.get('role') if caller_prof.data else None
            caller_branch_id = caller_prof.data.get('branch_id')

            if caller_role == 'branch_admin':
                target_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', user_id).single().execute()
                if not target_prof.data:
                    return jsonify({'error': 'Target user not found'}), 404
                
                target_role = target_prof.data.get('role')
                target_branch_id = target_prof.data.get('branch_id')

                if target_role != 'staff':
                    return jsonify({'error': 'Branch admin may only edit staff accounts'}), 403
                
                if target_branch_id != caller_branch_id:
                    return jsonify({'error': 'Branch admin may only edit staff in their own branch'}), 403
            elif caller_role != 'super_admin':
                return jsonify({'error': 'Unauthorized'}), 403
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': f'Auth check failed: {str(e)}'}), 500
        
        supabase = get_supabase_admin()
        
        # Check if trying to change role of a super_admin
        if 'role' in data and data.get('role') != 'super_admin':
            target_prof = supabase.table('user_profiles').select('role').eq('id', user_id).single().execute()
            if target_prof.data:
                target_role = target_prof.data.get('role')
                if target_role == 'super_admin':
                    return jsonify({
                        'error': 'Cannot downgrade super admin to a lower role. Super admin privileges cannot be removed.'
                    }), 403
        
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
        # Also clean up deleted_at if account is restored (is_active becomes True)
        if update_data.get('is_active') is True:
            supabase.table('user_profiles').update({'deleted_at': None}).eq('id', user_id).execute()
        
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
    Delete a user account (soft delete).
    
    Instead of permanently deleting the account, we:
    1. Deactivate the account (is_active = False)
    2. Keep user_profiles for history and audit trail
    3. Keep user_logs for backtracking
    4. Optionally disable auth access if possible
    
    Returns:
    {
        "success": true,
        "message": "Account deleted successfully"
    }
    """
    try:
        # authorization check before deleting
        try:
            caller_id = get_user_from_token()
            supabase_admin = get_supabase_admin()
            caller_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
            caller_role = caller_prof.data.get('role') if caller_prof.data else None
            caller_branch_id = caller_prof.data.get('branch_id')

            if caller_role == 'branch_admin':
                target_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', user_id).single().execute()
                if not target_prof.data:
                    return jsonify({'error': 'Target user not found'}), 404
                
                target_role = target_prof.data.get('role')
                target_branch_id = target_prof.data.get('branch_id')

                if target_role != 'staff':
                    return jsonify({'error': 'Branch admin may only delete staff accounts'}), 403
                
                if target_branch_id != caller_branch_id:
                    return jsonify({'error': 'Branch admin may only delete staff in their own branch'}), 403
            elif caller_role != 'super_admin':
                return jsonify({'error': 'Unauthorized'}), 403
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': f'Auth check failed: {str(e)}'}), 500

        # Soft delete: update user_profiles to set is_active=False and deleted_at=now()
        try:
            supabase_admin = get_supabase_admin()
            
            # Fetch user profile to verify valid user
            prof = supabase_admin.table('user_profiles').select('id').eq('id', user_id).single().execute()
            if not prof.data:
                return jsonify({'error': 'User not found'}), 404
            
            from datetime import datetime
            now_iso = datetime.utcnow().isoformat()
            
            update_response = supabase_admin.table('user_profiles').update({
                'is_active': False,
                'deleted_at': now_iso
            }).eq('id', user_id).execute()
            
            if not update_response.data:
                return jsonify({'error': 'Failed to soft delete user profile'}), 500

            return jsonify({
                'success': True,
                'message': 'Account soft deleted successfully.'
            }), 200
        
        except Exception as delete_err:
            import traceback
            err_str = str(delete_err)
            with open('delete_err.txt', 'w', encoding='utf-8') as f:
                f.write(traceback.format_exc())
            
            # If the user is already deleted, treat it as a success!
            if 'User not found' in err_str or '404' in getattr(delete_err, 'message', ''):
                return jsonify({
                    'success': True,
                    'message': 'User was already deleted.'
                }), 200
                
            return jsonify({
                'error': f'Hard delete failed: {err_str}. Please ensure all database constraints are updated.'
            }), 500
        
        except Exception as e:
            return jsonify({
                'error': f'Soft delete failed: {str(e)}'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Delete failed: {str(e)}'
        }), 500

@accounts_bp.route('/<user_id>/hard', methods=['DELETE'])
def hard_delete_account(user_id):
    """
    Hard delete a user account permanently.
    Only accessible by authorized admins.
    """
    try:
        # authorization check before deleting
        try:
            caller_id = get_user_from_token()
            supabase_admin = get_supabase_admin()
            caller_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
            caller_role = caller_prof.data.get('role') if caller_prof.data else None
            caller_branch_id = caller_prof.data.get('branch_id')

            if caller_role == 'branch_admin':
                target_prof = supabase_admin.table('user_profiles').select('role, branch_id').eq('id', user_id).single().execute()
                if not target_prof.data:
                    return jsonify({'error': 'Target user not found'}), 404
                
                target_role = target_prof.data.get('role')
                target_branch_id = target_prof.data.get('branch_id')

                if target_role != 'staff':
                    return jsonify({'error': 'Branch admin may only hard delete staff accounts'}), 403
                
                if target_branch_id != caller_branch_id:
                    return jsonify({'error': 'Branch admin may only hard delete staff in their own branch'}), 403
            elif caller_role != 'super_admin':
                return jsonify({'error': 'Unauthorized'}), 403
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': f'Auth check failed: {str(e)}'}), 500

        # Bypass any potentially cached global client state
        from supabase import create_client
        import os
        from dotenv import load_dotenv
        
        load_dotenv(override=True)
        fresh_service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        fresh_url = os.getenv("SUPABASE_URL", "")
        
        fresh_supabase_admin = create_client(fresh_url, fresh_service_key)
        
        # Hard delete: remove from auth.users
        # Due to ON DELETE CASCADE on user_profiles, this will also remove the profile.
        try:
            delete_response = fresh_supabase_admin.auth.admin.delete_user(user_id)
            
            # Check for error in response if applicable (Supabase-py behavior)
            if hasattr(delete_response, 'error') and delete_response.error:
                return jsonify({
                    'error': f'Auth delete failed: {str(delete_response.error)}'
                }), 500

            return jsonify({
                'success': True,
                'message': 'Account hard deleted successfully.'
            }), 200
        
        except Exception as delete_err:
            import traceback
            err_str = str(delete_err)
            
            if 'User not found' in err_str or '404' in getattr(delete_err, 'message', ''):
                return jsonify({
                    'success': True,
                    'message': 'User was already deleted.'
                }), 200
                
            return jsonify({
                'error': f'Hard delete failed: {err_str}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': f'Delete failed: {str(e)}'
        }), 500



@accounts_bp.route('/verify-password', methods=['POST'])
def verify_password():
    """
    Verify the user's password before allowing sensitive operations like deletion.
    This provides an additional security layer by confirming the user's identity.
    
    Request body:
    {
        "password": "user_password"
    }
    
    Returns:
    {
        "success": true,
        "verified": true
    }
    """
    try:
        # Get the current user from token
        try:
            user_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        
        data = request.get_json()
        if not data or 'password' not in data:
            return jsonify({'error': 'Password is required'}), 400
        
        password = data.get('password', '').strip()
        if not password:
            return jsonify({'error': 'Password cannot be empty'}), 400
        
        # Get the user email from user_profiles
        try:
            supabase_admin = get_supabase_admin()
            user_profile = supabase_admin.table('user_profiles').select('email').eq('id', user_id).single().execute()
            
            if not user_profile.data:
                return jsonify({'error': 'User not found'}), 404
            
            email = user_profile.data.get('email')
        except Exception as e:
            return jsonify({'error': f'Failed to retrieve user email: {str(e)}'}), 500
        
        # Attempt to verify password using the auth API
        try:
            # Use the existing anon client to verify credentials
            supabase_verify = get_supabase()
            
            # Try to authenticate with the provided password
            auth_response = supabase_verify.auth.sign_in_with_password(
                credentials={
                    'email': email,
                    'password': password
                }
            )
            
            # If we get here without exception and have a session, password is correct
            if auth_response and auth_response.session:
                return jsonify({
                    'success': True,
                    'verified': True
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'verified': False,
                    'error': 'Password verification failed'
                }), 401
                
        except Exception as auth_error:
            # Authentication failed - password is incorrect
            error_message = str(auth_error).lower()
            if 'invalid login credentials' in error_message or 'incorrect password' in error_message or 'unauthorized' in error_message:
                return jsonify({
                    'success': False,
                    'verified': False,
                    'error': 'Incorrect password'
                }), 401
            else:
                return jsonify({
                    'success': False,
                    'verified': False,
                    'error': 'Password verification failed'
                }), 401
    
    except Exception as e:
        return jsonify({
            'error': f'Verification failed: {str(e)}'
        }), 500
