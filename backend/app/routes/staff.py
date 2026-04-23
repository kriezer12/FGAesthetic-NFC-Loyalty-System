"""
Staff Management Routes
=======================

Endpoints for retrieving bookable staff for the calendar, bypassing RLS using service roles.
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from app.routes.accounts import get_user_from_token
from app.services.supabase_client import get_supabase_admin

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')


def _safe_parse_datetime(value):
    if not value:
        return None
    try:
        normalized = value.replace('Z', '+00:00')
        return datetime.fromisoformat(normalized)
    except Exception:
        return None


def _resolve_assignment_status(starts_at, ends_at, persisted_status):
    if persisted_status == 'cancelled':
        return 'cancelled'

    now = datetime.now(timezone.utc)
    start_dt = _safe_parse_datetime(starts_at)
    end_dt = _safe_parse_datetime(ends_at)

    if not start_dt or not end_dt:
        return persisted_status or 'active'

    if start_dt > now:
        return 'upcoming'
    if end_dt < now:
        return 'expired'
    return 'active'


def _intervals_overlap(a_start, a_end, b_start, b_end):
    return a_start < b_end and b_start < a_end

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
        
        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404
            
        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')
        range_start = _safe_parse_datetime(request.args.get('range_start'))
        range_end = _safe_parse_datetime(request.args.get('range_end'))

        caller_branch_name = None
        if caller_branch_id:
            caller_branch_res = supabase.table('branches').select('name').eq('id', caller_branch_id).single().execute()
            if caller_branch_res.data:
                caller_branch_name = caller_branch_res.data.get('name')
        
        # Calendar roles we want to display
        calendar_roles = ["staff"]
        
        query = supabase.table('user_profiles').select('id, full_name, role, avatar_url, branch_id').in_('role', calendar_roles)
        
        if caller_role == 'staff':
            query = query.eq('id', caller_id)
        elif caller_role == 'branch_admin':
            if not caller_branch_id:
                return jsonify({'success': True, 'staff': []}), 200
            query = query.eq('branch_id', caller_branch_id)
            
        response = query.order('full_name').execute()
        staff_rows = response.data or []

        # If a staff user is temporarily assigned, enrich with home/host branch names
        # for UI context only. Keep branch_id as the staff's home branch.
        if caller_role == 'staff' and caller_branch_id and staff_rows:
            assignment_query = (
                supabase
                .table('staff_cross_branch_assignments')
                .select('host_branch_id, home_branch_id')
                .eq('staff_id', caller_id)
                .neq('host_branch_id', caller_branch_id)
                .is_('cancelled_at', 'null')
            )

            if range_start and range_end:
                assignment_query = (
                    assignment_query
                    .lte('starts_at', range_end.isoformat())
                    .gte('ends_at', range_start.isoformat())
                )
            else:
                now_iso = datetime.now(timezone.utc).isoformat()
                assignment_query = (
                    assignment_query
                    .in_('status', ['active', 'upcoming'])
                    .lte('starts_at', now_iso)
                    .gte('ends_at', now_iso)
                )

            assignment_res = assignment_query.order('starts_at', desc=True).limit(1).execute()
            assignment = (assignment_res.data or [None])[0]

            if assignment and assignment.get('host_branch_id'):
                home_branch_name = None
                host_branch_name = None
                home_branch_id = assignment.get('home_branch_id')
                host_branch_id = assignment.get('host_branch_id')
                if home_branch_id:
                    home_branch_res = (
                        supabase
                        .table('branches')
                        .select('name')
                        .eq('id', home_branch_id)
                        .single()
                        .execute()
                    )
                    if home_branch_res.data:
                        home_branch_name = home_branch_res.data.get('name')

                if host_branch_id:
                    host_branch_res = (
                        supabase
                        .table('branches')
                        .select('name')
                        .eq('id', host_branch_id)
                        .single()
                        .execute()
                    )
                    if host_branch_res.data:
                        host_branch_name = host_branch_res.data.get('name')

                staff_rows[0]['is_temporary_assignment'] = True
                staff_rows[0]['home_branch_name'] = home_branch_name
                staff_rows[0]['host_branch_name'] = host_branch_name

        # Include active temporary assignees from other branches for borrowing branch admins.
        if caller_role == 'branch_admin' and caller_branch_id:
            assignment_query = (
                supabase
                .table('staff_cross_branch_assignments')
                .select('staff_id, home_branch_id')
                .eq('host_branch_id', caller_branch_id)
                .is_('cancelled_at', 'null')
            )

            if range_start and range_end:
                assignment_query = (
                    assignment_query
                    .lte('starts_at', range_end.isoformat())
                    .gte('ends_at', range_start.isoformat())
                )
            else:
                now_iso = datetime.now(timezone.utc).isoformat()
                assignment_query = (
                    assignment_query
                    .in_('status', ['active', 'upcoming'])
                    .gte('ends_at', now_iso)
                )

            assignment_res = assignment_query.execute()

            assignment_rows = assignment_res.data or []
            incoming_staff_ids = [r.get('staff_id') for r in assignment_rows if r.get('staff_id')]

            if incoming_staff_ids:
                incoming_staff_res = (
                    supabase
                    .table('user_profiles')
                    .select('id, full_name, role, avatar_url, branch_id')
                    .in_('id', incoming_staff_ids)
                    .in_('role', calendar_roles)
                    .execute()
                )

                branch_ids = list({r.get('home_branch_id') for r in assignment_rows if r.get('home_branch_id')})
                branch_map = {}
                if branch_ids:
                    branches_res = supabase.table('branches').select('id, name').in_('id', branch_ids).execute()
                    branch_map = {b.get('id'): b.get('name') for b in (branches_res.data or [])}

                assignment_home_map = {r.get('staff_id'): r.get('home_branch_id') for r in assignment_rows}

                base_ids = {s.get('id') for s in staff_rows}
                for incoming in (incoming_staff_res.data or []):
                    staff_id = incoming.get('id')
                    if not staff_id or staff_id in base_ids:
                        continue
                    home_branch_id = assignment_home_map.get(staff_id)
                    incoming['is_temporary_assignment'] = True
                    incoming['home_branch_name'] = branch_map.get(home_branch_id)
                    incoming['host_branch_name'] = caller_branch_name
                    incoming['branch_id'] = caller_branch_id
                    staff_rows.append(incoming)
        
        return jsonify({
            'success': True,
            'staff': staff_rows
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to fetch staff: {str(e)}'
        }), 500


@staff_bp.route('/cross-branch-candidates', methods=['GET'])
def list_cross_branch_candidates():
    """List candidate staff that can be temporarily assigned across branches."""
    try:
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()

        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404

        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')

        if caller_role not in ['super_admin', 'branch_admin']:
            return jsonify({'error': 'Forbidden'}), 403

        query = supabase.table('user_profiles').select('id, full_name, role, branch_id').eq('role', 'staff')

        # Borrowing branch admins can borrow from other branches only.
        if caller_role == 'branch_admin' and caller_branch_id:
            query = query.neq('branch_id', caller_branch_id)

        profiles_res = query.order('full_name').execute()
        profiles = profiles_res.data or []

        branch_ids = list({p.get('branch_id') for p in profiles if p.get('branch_id')})
        branch_map = {}
        if branch_ids:
            branches_res = supabase.table('branches').select('id, name').in_('id', branch_ids).execute()
            branch_map = {b.get('id'): b.get('name') for b in (branches_res.data or [])}

        enriched = []
        for p in profiles:
            enriched.append({
                'id': p.get('id'),
                'full_name': p.get('full_name'),
                'role': p.get('role'),
                'branch_id': p.get('branch_id'),
                'branch_name': branch_map.get(p.get('branch_id')),
            })

        return jsonify({'success': True, 'staff': enriched}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch candidates: {str(e)}'}), 500


@staff_bp.route('/cross-branch-assignments', methods=['GET'])
def list_cross_branch_assignments():
    """List cross-branch temporary assignments."""
    try:
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404

        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')
        if caller_role not in ['super_admin', 'branch_admin']:
            return jsonify({'error': 'Forbidden'}), 403

        host_branch_filter = request.args.get('host_branch_id')
        status_filter = request.args.get('status')

        query = supabase.table('staff_cross_branch_assignments').select('*').order('created_at', desc=True)

        if caller_role == 'branch_admin':
            if not caller_branch_id:
                return jsonify({'success': True, 'assignments': []}), 200
            query = query.eq('host_branch_id', caller_branch_id)
        elif host_branch_filter:
            query = query.eq('host_branch_id', host_branch_filter)

        rows_res = query.execute()
        rows = rows_res.data or []

        staff_ids = list({r.get('staff_id') for r in rows if r.get('staff_id')})
        user_ids = list({r.get('created_by') for r in rows if r.get('created_by')} | {r.get('cancelled_by') for r in rows if r.get('cancelled_by')})
        branch_ids = list({r.get('home_branch_id') for r in rows if r.get('home_branch_id')} | {r.get('host_branch_id') for r in rows if r.get('host_branch_id')})

        staff_map = {}
        if staff_ids:
            staff_res = supabase.table('user_profiles').select('id, full_name').in_('id', staff_ids).execute()
            staff_map = {s.get('id'): s.get('full_name') for s in (staff_res.data or [])}

        user_map = {}
        if user_ids:
            user_res = supabase.table('user_profiles').select('id, full_name').in_('id', user_ids).execute()
            user_map = {u.get('id'): u.get('full_name') for u in (user_res.data or [])}

        branch_map = {}
        if branch_ids:
            branch_res = supabase.table('branches').select('id, name').in_('id', branch_ids).execute()
            branch_map = {b.get('id'): b.get('name') for b in (branch_res.data or [])}

        home_branch_admin_map = {}
        if branch_ids:
            admin_res = (
                supabase
                .table('user_profiles')
                .select('id, full_name, branch_id')
                .eq('role', 'branch_admin')
                .in_('branch_id', branch_ids)
                .execute()
            )
            for admin in (admin_res.data or []):
                branch_id = admin.get('branch_id')
                if branch_id and branch_id not in home_branch_admin_map:
                    home_branch_admin_map[branch_id] = admin.get('full_name')

        enriched = []
        for r in rows:
            computed_status = _resolve_assignment_status(r.get('starts_at'), r.get('ends_at'), r.get('status'))
            if status_filter and computed_status != status_filter:
                continue
            enriched.append({
                **r,
                'computed_status': computed_status,
                'staff_name': staff_map.get(r.get('staff_id')),
                'home_branch_name': branch_map.get(r.get('home_branch_id')),
                'host_branch_name': branch_map.get(r.get('host_branch_id')),
                'home_branch_admin_name': home_branch_admin_map.get(r.get('home_branch_id')),
                'created_by_name': user_map.get(r.get('created_by')),
                'cancelled_by_name': user_map.get(r.get('cancelled_by')),
            })

        return jsonify({'success': True, 'assignments': enriched}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch assignments: {str(e)}'}), 500


@staff_bp.route('/cross-branch-assignments', methods=['POST'])
def create_cross_branch_assignment():
    """Create a temporary cross-branch assignment for staff."""
    try:
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404

        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')
        if caller_role not in ['super_admin', 'branch_admin']:
            return jsonify({'error': 'Forbidden'}), 403

        payload = request.get_json(force=True, silent=True) or {}
        staff_id = payload.get('staff_id')
        starts_at = payload.get('starts_at')
        ends_at = payload.get('ends_at')
        reason = (payload.get('reason') or '').strip()

        if not staff_id or not starts_at or not ends_at or not reason:
            return jsonify({'error': 'staff_id, starts_at, ends_at, and reason are required'}), 400

        if staff_id == caller_id:
            return jsonify({'error': 'Self-assignment is not allowed'}), 400

        start_dt = _safe_parse_datetime(starts_at)
        end_dt = _safe_parse_datetime(ends_at)
        if not start_dt or not end_dt:
            return jsonify({'error': 'Invalid date format for starts_at or ends_at'}), 400
        if end_dt <= start_dt:
            return jsonify({'error': 'ends_at must be after starts_at'}), 400

        staff_profile = supabase.table('user_profiles').select('id, role, branch_id').eq('id', staff_id).single().execute()
        if not staff_profile.data:
            return jsonify({'error': 'Staff user not found'}), 404

        if staff_profile.data.get('role') != 'staff':
            return jsonify({'error': 'Only staff users can receive temporary assignments'}), 400

        home_branch_id = staff_profile.data.get('branch_id')
        host_branch_id = payload.get('host_branch_id')

        if caller_role == 'branch_admin':
            host_branch_id = caller_branch_id
        if not host_branch_id:
            return jsonify({'error': 'host_branch_id is required'}), 400

        if caller_role == 'branch_admin' and host_branch_id != caller_branch_id:
            return jsonify({'error': 'Forbidden: borrowing branch mismatch'}), 403

        if home_branch_id and home_branch_id == host_branch_id:
            return jsonify({'error': 'Staff already belongs to the selected branch'}), 400

        # Prevent overlapping active/upcoming assignments for same staff to same borrowing branch.
        overlap_candidates = (
            supabase
            .table('staff_cross_branch_assignments')
            .select('starts_at, ends_at, status, cancelled_at')
            .eq('staff_id', staff_id)
            .eq('host_branch_id', host_branch_id)
            .in_('status', ['active', 'upcoming'])
            .execute()
        )

        for row in (overlap_candidates.data or []):
            if row.get('cancelled_at'):
                continue
            row_start = _safe_parse_datetime(row.get('starts_at'))
            row_end = _safe_parse_datetime(row.get('ends_at'))
            if row_start and row_end and _intervals_overlap(start_dt, end_dt, row_start, row_end):
                return jsonify({'error': 'Overlapping assignment already exists for this staff and branch'}), 409

        now = datetime.now(timezone.utc)
        persisted_status = 'upcoming' if start_dt > now else 'active'

        insert_payload = {
            'staff_id': staff_id,
            'home_branch_id': home_branch_id,
            'host_branch_id': host_branch_id,
            'starts_at': start_dt.isoformat(),
            'ends_at': end_dt.isoformat(),
            'reason': reason,
            'status': persisted_status,
            'created_by': caller_id,
        }

        ins = supabase.table('staff_cross_branch_assignments').insert(insert_payload).execute()
        created = (ins.data or [None])[0]

        return jsonify({'success': True, 'assignment': created}), 201
    except Exception as e:
        return jsonify({'error': f'Failed to create assignment: {str(e)}'}), 500


@staff_bp.route('/cross-branch-assignments/<assignment_id>/cancel', methods=['PATCH'])
def cancel_cross_branch_assignment(assignment_id):
    """Cancel an existing temporary assignment."""
    try:
        try:
            caller_id = get_user_from_token()
        except ValueError as e:
            return jsonify({'error': str(e)}), 401

        supabase = get_supabase_admin()
        caller_profile = supabase.table('user_profiles').select('role, branch_id').eq('id', caller_id).single().execute()
        if not caller_profile.data:
            return jsonify({'error': 'User profile not found'}), 404

        caller_role = caller_profile.data.get('role')
        caller_branch_id = caller_profile.data.get('branch_id')
        if caller_role not in ['super_admin', 'branch_admin']:
            return jsonify({'error': 'Forbidden'}), 403

        existing_res = supabase.table('staff_cross_branch_assignments').select('*').eq('id', assignment_id).single().execute()
        existing = existing_res.data
        if not existing:
            return jsonify({'error': 'Assignment not found'}), 404

        if caller_role == 'branch_admin' and existing.get('host_branch_id') != caller_branch_id:
            return jsonify({'error': 'Forbidden'}), 403

        payload = request.get_json(force=True, silent=True) or {}
        cancelled_reason = (payload.get('cancelled_reason') or '').strip()

        update_payload = {
            'status': 'cancelled',
            'cancelled_at': datetime.now(timezone.utc).isoformat(),
            'cancelled_by': caller_id,
            'cancelled_reason': cancelled_reason or None,
        }

        upd = (
            supabase
            .table('staff_cross_branch_assignments')
            .update(update_payload)
            .eq('id', assignment_id)
            .execute()
        )

        return jsonify({'success': True, 'assignment': (upd.data or [None])[0]}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to cancel assignment: {str(e)}'}), 500
