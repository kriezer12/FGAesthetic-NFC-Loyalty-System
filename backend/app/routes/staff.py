"""
Staff Management Routes
=======================

Endpoints for retrieving bookable staff for the calendar, bypassing RLS using service roles.
"""

from flask import Blueprint, jsonify
from app.routes.accounts import get_user_from_token
from app.services.supabase_client import get_supabase_admin

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')

@staff_bp.route('/list', methods=['GET'])
def list_staff():
    """
    Get bookable staff for the calendar.
    - super_admin: sees all staff across all branches
    - branch_admin / staff: sees only staff in their branch
    """
    try:
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        
        caller_response = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).execute()
        
        if not caller_response.data:
            return jsonify({'error': 'User profile not found'}), 404
            
        caller_role = caller_response.data[0].get('role')
        caller_branch_id = caller_response.data[0].get('branch_id')
        
        # Calendar roles we want to display
        calendar_roles = ["super_admin", "branch_admin", "staff"]
        
        query = supabase.table('user_profiles').select('id, full_name, role, avatar_url').in_('role', calendar_roles)
        
        if caller_role == 'staff':
            query = query.eq('id', caller_id)
        elif caller_role == 'branch_admin':
            if not caller_branch_id:
                return jsonify({'success': True, 'staff': []}), 200
            query = query.eq('branch_id', caller_branch_id)
            
        response = query.order('full_name').execute()
        
        return jsonify({
            'success': True,
            'staff': response.data or []
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to fetch staff: {str(e)}'
        }), 500
