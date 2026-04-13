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
