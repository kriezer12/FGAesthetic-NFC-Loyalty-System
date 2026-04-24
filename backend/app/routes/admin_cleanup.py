"""
Admin Cleanup Routes
====================

Endpoints for cleaning up invalid data from the database.
Only super_admin can access these.
"""

from flask import Blueprint, jsonify
from app.routes.accounts import get_user_from_token
from app.services.supabase_client import get_supabase_admin

cleanup_bp = Blueprint('cleanup', __name__, url_prefix='/api/admin/cleanup')

@cleanup_bp.route('/invalid-appointments', methods=['DELETE'])
def cleanup_invalid_appointments():
    """
    Delete appointments with invalid staff IDs (non-UUID format).
    Only accessible to super_admin.
    """
    try:
        # Authenticate and check super_admin role
        try:
            admin_user_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        
        # Check if user is super_admin
        caller_profile = supabase.table('user_profiles').select('role').eq('id', admin_user_id).single().execute()
        
        if not caller_profile.data or caller_profile.data.get('role') != 'super_admin':
            return jsonify({'error': 'Only super_admin can perform cleanup'}), 403

        # Query appointments with invalid staff_id format
        # Valid UUID format: 8-4-4-4-12 hex digits separated by hyphens
        response = supabase.from_("appointments").select("id, staff_id, customer_name").execute()
        
        appointments = response.data or []
        invalid_ids = []
        
        # Check each staff_id for valid UUID format
        for appt in appointments:
            staff_id = appt.get('staff_id')
            if staff_id and not is_valid_uuid(staff_id):
                invalid_ids.append(appt['id'])
        
        if not invalid_ids:
            return jsonify({
                'success': True,
                'message': 'No invalid appointments found',
                'deleted_count': 0,
                'invalid_ids': []
            }), 200
        
        # Delete invalid appointments
        for appt_id in invalid_ids:
            supabase.from_("appointments").delete().eq("id", appt_id).execute()
        
        return jsonify({
            'success': True,
            'message': f'Deleted {len(invalid_ids)} appointments with invalid staff IDs',
            'deleted_count': len(invalid_ids),
            'invalid_ids': invalid_ids
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Cleanup failed: {str(e)}'
        }), 500

def is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID format."""
    import re
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, value.lower()))
