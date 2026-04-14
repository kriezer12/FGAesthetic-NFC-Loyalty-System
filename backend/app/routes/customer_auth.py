"""
Customer Authentication Routes
===============================

Endpoints for customer-specific authentication and password management.
Customers register via NFC scan and use email/password to access the portal.
"""

from flask import Blueprint, request, jsonify
from app.services.supabase_client import get_supabase, get_supabase_admin
import jwt
from app.config import config
import sys

customer_auth_bp = Blueprint('customer_auth', __name__, url_prefix='/api/customer')


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
    except Exception as e:
        raise ValueError(f'Invalid token format: {str(e)}')


@customer_auth_bp.route('/register-after-signup', methods=['POST'])
def register_after_signup():
    """
    Create a customer record after signup, before email confirmation.
    Called from the frontend immediately after user signs up.
    
    This prepares the customer record so it's ready when the user confirms their email.
    After email confirmation, the record will be linked to the auth user.
    
    Request body:
    {
        "email": "customer@example.com",
        "name": "Customer Name"
    }
    
    Returns:
    {
        "success": true,
        "message": "Customer record created"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body must be valid JSON'}), 400
        
        email = data.get('email', '').lower().strip()
        name = data.get('name', '').strip()
        
        if not email or not name:
            return jsonify({'error': 'Email and name are required'}), 400
        
        if '@' not in email:
            return jsonify({'error': 'Invalid email address'}), 400
        
        supabase_admin = get_supabase_admin()
        
        # Check if customer with this email already exists
        existing = supabase_admin.table('customers').select('id').eq('email', email).maybeSingle().execute()
        if existing.data:
            # Customer already exists
            return jsonify({
                'success': True,
                'message': 'Customer record already exists'
            }), 200
        
        # Create customer record without user_id (will be linked after email confirmation)
        insert_result = supabase_admin.table('customers').insert({
            'name': name,
            'email': email,
        }).execute()
        
        if not insert_result.data:
            print(f"[CUSTOMER_AUTH] Failed to create customer record for {email}", file=sys.stderr)
            return jsonify({'error': 'Failed to create customer record'}), 500
        
        print(f"[CUSTOMER_AUTH] Pre-registered customer {insert_result.data[0].get('id')} for {email}", file=sys.stderr)
        
        return jsonify({
            'success': True,
            'message': 'Customer record created'
        }), 201
        
    except Exception as e:
        print(f"[CUSTOMER_AUTH] Error in register_after_signup: {str(e)}", file=sys.stderr)
        return jsonify({'error': f'Failed to process signup: {str(e)}'}), 500


@customer_auth_bp.route('/register', methods=['POST'])
def register_customer():
    """
    Register/create a customer record for a newly signed-up user.
    Creates the customer database record and links it to the auth user via user_id.
    
    Requires valid Authorization header with the customer's auth token.
    
    Request body:
    {
        "name": "Customer Name",
        "email": "customer@example.com"  (optional - will use from auth if not provided)
    }
    
    Returns:
    {
        "success": true,
        "customer_id": "customer_record_id",
        "user_id": "auth_user_id",
        "name": "Customer Name",
        "email": "customer@example.com"
    }
    """
    try:
        user_id = get_user_from_token()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body must be valid JSON'}), 400
        
        name = data.get('name')
        email = data.get('email')
        
        if not name:
            return jsonify({'error': 'Customer name is required'}), 400
        
        supabase_admin = get_supabase_admin()
        
        # Check if customer already exists for this user_id
        existing = supabase_admin.table('customers').select('id').eq('user_id', user_id).maybeSingle().execute()
        if existing.data:
            # Customer already registered
            return jsonify({
                'success': True,
                'message': 'Customer already registered',
                'customer_id': existing.data['id'],
                'user_id': user_id
            }), 200
        
        # Check if customer with this email exists (from pre-registration)
        email_match = supabase_admin.table('customers').select('id').eq('email', email or '').maybeSingle().execute()
        if email_match.data:
            # Found pre-registered customer, link it
            result = supabase_admin.table('customers').update({
                'user_id': user_id,
                'name': name
            }).eq('id', email_match.data['id']).execute()
            
            if result.data:
                print(f"[CUSTOMER_AUTH] Linked pre-registered customer {email_match.data['id']} to user {user_id}", file=sys.stderr)
                return jsonify({
                    'success': True,
                    'message': 'Customer linked successfully',
                    'customer_id': result.data[0].get('id'),
                    'user_id': user_id,
                    'name': result.data[0].get('name'),
                    'email': result.data[0].get('email')
                }), 200
        
        # Check if customer with this name exists (fallback)
        name_match = supabase_admin.table('customers').select('id').eq('name', name).maybeSingle().execute()
        if name_match.data and not name_match.data.get('user_id'):
            # Found unlinked customer by name, link it
            result = supabase_admin.table('customers').update({
                'user_id': user_id,
                'email': email or ''
            }).eq('id', name_match.data['id']).execute()
            
            if result.data:
                print(f"[CUSTOMER_AUTH] Linked customer by name {name_match.data['id']} to user {user_id}", file=sys.stderr)
                return jsonify({
                    'success': True,
                    'message': 'Customer linked successfully',
                    'customer_id': result.data[0].get('id'),
                    'user_id': user_id,
                    'name': result.data[0].get('name'),
                    'email': result.data[0].get('email')
                }), 200
        
        # Create new customer record with user_id linkage
        insert_result = supabase_admin.table('customers').insert({
            'name': name,
            'email': email or '',
            'user_id': user_id,
        }).execute()
        
        if not insert_result.data:
            return jsonify({'error': 'Failed to create customer record'}), 500
        
        customer = insert_result.data[0]
        
        print(f"[CUSTOMER_AUTH] Customer registered: {customer.get('id')} for user {user_id}", file=sys.stderr)
        
        return jsonify({
            'success': True,
            'customer_id': customer.get('id'),
            'user_id': user_id,
            'name': customer.get('name'),
            'email': customer.get('email')
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        print(f"[CUSTOMER_AUTH] Error registering customer: {str(e)}", file=sys.stderr)
        return jsonify({'error': f'Failed to register customer: {str(e)}'}), 500


@customer_auth_bp.route('/set-password', methods=['POST'])
def set_initial_password():
    """
    Set the initial password for a newly registered customer.
    
    Request body:
    {
        "email": "customer@example.com",
        "password": "secure_password_123"
    }
    
    Returns:
    {
        "success": true,
        "message": "Password set successfully"
    }
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header is required'}), 401
        
        user_id = get_user_from_token()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body must be valid JSON'}), 400
        
        password = data.get('password')
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Update user password via Supabase admin
        supabase_admin = get_supabase_admin()
        supabase_admin.auth.admin_update_user_by_id(
            user_id,
            {"password": password}
        )
        
        # Mark that customer has set password (optional - useful for tracking)
        customer = supabase_admin.table('customers').select('id').eq('user_id', user_id).single().execute()
        if customer.data:
            supabase_admin.table('customers').update({
                'password_set_at': 'now()'
            }).eq('id', customer.data['id']).execute()
        
        return jsonify({
            'success': True,
            'message': 'Password set successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        print(f"[CUSTOMER_AUTH] Error setting password: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to set password'}), 500


@customer_auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Change password for authenticated customer.
    
    Request body:
    {
        "current_password": "old_password",
        "new_password": "new_secure_password"
    }
    
    Returns:
    {
        "success": true,
        "message": "Password changed successfully"
    }
    """
    try:
        user_id = get_user_from_token()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body must be valid JSON'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Both current and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        # First verify current password by trying to get the user's email and verify it
        supabase_admin = get_supabase_admin()
        
        # Get customer info to find email
        customer = supabase_admin.table('customers').select('email').eq('user_id', user_id).single().execute()
        if not customer.data:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer_email = customer.data.get('email')
        
        # Try to authenticate with current password to verify it's correct
        supabase_anon = get_supabase()
        try:
            supabase_anon.auth.sign_in_with_password({
                'email': customer_email,
                'password': current_password
            })
        except Exception as e:
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Update password
        supabase_admin.auth.admin_update_user_by_id(
            user_id,
            {"password": new_password}
        )
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        print(f"[CUSTOMER_AUTH] Error changing password: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to change password'}), 500


@customer_auth_bp.route('/profile', methods=['GET'])
def get_customer_profile():
    """
    Get the current customer's profile information.
    Requires authentication.
    
    Returns:
    {
        "id": "customer_id",
        "user_id": "auth_user_id",
        "name": "Customer Name",
        "email": "customer@example.com",
        "phone": "+1234567890",
        "branch_id": "branch_uuid",
        "created_at": "2026-01-01T00:00:00Z"
    }
    """
    try:
        user_id = get_user_from_token()
        
        supabase_admin = get_supabase_admin()
        customer = supabase_admin.table('customers').select('*').eq('user_id', user_id).single().execute()
        
        if not customer.data:
            return jsonify({'error': 'Customer profile not found'}), 404
        
        return jsonify(customer.data), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        print(f"[CUSTOMER_AUTH] Error fetching profile: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to fetch profile'}), 500
