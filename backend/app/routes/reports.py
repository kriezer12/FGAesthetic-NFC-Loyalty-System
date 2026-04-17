"""
Reports Module
==============

Generate and export business and operational reports for managers.
Provides client status summaries, treatment progress, and data exports.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from flask import Blueprint, jsonify, request
from app.services.supabase_client import get_supabase_admin
import sys

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

INACTIVE_THRESHOLD_DAYS = 60


def _is_inactive_client(customer: Dict[str, Any]) -> bool:
    """Determine if a customer is inactive based on last_visit."""
    if customer.get("archived_at"):
        return False
    
    # Explicit last_inactive timestamp takes precedence
    if customer.get("last_inactive"):
        return True
    
    # No visit history = inactive
    if not customer.get("last_visit"):
        return True
    
    # Calculate inactivity based on last visit
    last_visit = datetime.fromisoformat(customer["last_visit"].replace("Z", "+00:00"))
    days_since_visit = (datetime.now(last_visit.tzinfo) - last_visit).days
    return days_since_visit > INACTIVE_THRESHOLD_DAYS


@reports_bp.route('/clients/counts', methods=['GET'])
def get_client_counts():
    """
    Get counts of active, inactive, and archived clients.
    
    Returns:
        {
            "active_count": int,
            "inactive_count": int,
            "archived_count": int,
            "total_count": int
        }
    """
    try:
        supabase = get_supabase_admin()
        
        # Fetch all customers
        response = supabase.table("customers").select("*").execute()
        customers = response.data or []
        
        print(f"[REPORTS] Fetched {len(customers)} customers", file=sys.stderr)
        
        active_count = 0
        inactive_count = 0
        archived_count = 0
        
        for customer in customers:
            if customer.get("archived_at"):
                archived_count += 1
            elif _is_inactive_client(customer):
                inactive_count += 1
            else:
                active_count += 1
        
        total_count = len(customers)
        
        print(
            f"[REPORTS] Counts - Active: {active_count}, Inactive: {inactive_count}, Archived: {archived_count}, Total: {total_count}",
            file=sys.stderr
        )
        
        return jsonify({
            "active_count": active_count,
            "inactive_count": inactive_count,
            "archived_count": archived_count,
            "total_count": total_count,
        }), 200
    
    except Exception as e:
        print(f"[REPORTS ERROR] get_client_counts: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch client counts"}), 500


@reports_bp.route('/clients/archived', methods=['GET'])
def get_archived_clients():
    """
    Get list of all archived clients with basic info.
    
    Returns:
        List of archived customer records
    """
    try:
        supabase = get_supabase_admin()
        
        response = supabase.table("customers").select(
            "id, name, first_name, last_name, email, phone, archived_at, visits, points"
        ).not_.is_("archived_at", "null").order("archived_at", desc=True).execute()
        
        archived_clients = response.data or []
        print(f"[REPORTS] Fetched {len(archived_clients)} archived clients", file=sys.stderr)
        
        return jsonify(archived_clients), 200
    
    except Exception as e:
        print(f"[REPORTS ERROR] get_archived_clients: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch archived clients"}), 500


@reports_bp.route('/treatments/summary', methods=['GET'])
def get_treatment_summary():
    """
    Summarize treatment package usage across all appointments.

    Queries appointments (excluding cancelled) joined against package services,
    so data is always present as long as appointments have been booked.

    Returns:
        List of treatment summaries:
        {
            "treatment_name": str,
            "total_clients": int,
            "total_sessions": int,   -- all non-cancelled appointment slots
            "used_sessions": int,    -- slots with status='completed'
            "remaining_sessions": int -- slots not yet completed
        }
    """
    try:
        supabase = get_supabase_admin()

        # Fetch all package services
        services_resp = supabase.table("services").select("id, name, session_count").eq("is_package", True).execute()
        package_services: Dict[str, Any] = {s["id"]: s for s in (services_resp.data or [])}

        if not package_services:
            print("[REPORTS] No package services found", file=sys.stderr)
            return jsonify([]), 200

        # Fetch all non-cancelled appointments with service_ids and status
        appts_resp = supabase.table("appointments").select(
            "id, customer_id, service_ids, status"
        ).neq("status", "cancelled").execute()
        appointments = appts_resp.data or []

        # Get all unique customer IDs from appointments to fetch names in one go
        customer_ids_to_fetch = {appt.get("customer_id") for appt in appointments if appt.get("customer_id")}

        # Fetch basic customer profiles for these IDs
        customer_map: Dict[str, Dict[str, str]] = {}
        if customer_ids_to_fetch:
            # We must batch requests if the list is incredibly large, but usually it fits in one `in_` filter.
            # Convert set to list for python supabase client's .in_()
            customer_ids_list = list(customer_ids_to_fetch)
            # In case list exceeds single request capacity (e.g. > 1000 items), fetch all customers just to be safe.
            # But better to just fetch first/last_name and id for all customers to avoid complex chunking if this is small scale.
            # Let's just fetch all customers name mapping for simplicity as this is a dashboard report
            cust_resp = supabase.table("customers").select("id, name, first_name, last_name").execute()
            for c in (cust_resp.data or []):
                full_name = c.get("name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or "Unknown Client"
                customer_map[c["id"]] = {"id": c["id"], "name": full_name}

        # Aggregate per package service name
        treatment_map: Dict[str, Any] = {}

        for appt in appointments:
            service_ids = appt.get("service_ids") or []
            customer_id = appt.get("customer_id")
            status = appt.get("status", "")

            for svc_id in service_ids:
                if svc_id not in package_services:
                    continue

                name = package_services[svc_id]["name"]

                if name not in treatment_map:
                    treatment_map[name] = {
                        "treatment_name": name,
                        "_client_ids": set(),
                        "clients": {},  # Use dict to dedupe clients by ID
                        "total_sessions": 0,
                        "used_sessions": 0,
                        "remaining_sessions": 0,
                    }

                treatment_map[name]["total_sessions"] += 1
                if customer_id:
                    treatment_map[name]["_client_ids"].add(customer_id)
                    if customer_id in customer_map:
                        treatment_map[name]["clients"][customer_id] = customer_map[customer_id]
                if status == "completed":
                    treatment_map[name]["used_sessions"] += 1
                else:
                    treatment_map[name]["remaining_sessions"] += 1

        result = [
            {
                "treatment_name": v["treatment_name"],
                "total_clients": len(v["_client_ids"]),
                "clients": list(v["clients"].values()),
                "total_sessions": v["total_sessions"],
                "used_sessions": v["used_sessions"],
                "remaining_sessions": v["remaining_sessions"],
            }
            for v in treatment_map.values()
        ]

        print(f"[REPORTS] Found {len(result)} unique treatments from appointments", file=sys.stderr)
        return jsonify(result), 200

    except Exception as e:
        print(f"[REPORTS ERROR] get_treatment_summary: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch treatment summary"}), 500


@reports_bp.route('/clients/list', methods=['GET'])
def get_clients_list():
    """
    Get paginated list of clients with their computed status.

    Query params:
        status: "active" | "inactive" | "archived" | "all" (default "all")
        search: search string matched against name/email/phone
        page: page number (1-based, default 1)
        per_page: items per page (default 50, max 200)

    Returns:
        {
            "clients": [...],
            "total": int,
            "page": int,
            "per_page": int,
            "pages": int
        }
    """
    try:
        supabase = get_supabase_admin()

        status_filter: Optional[str] = request.args.get('status', 'all')
        search: Optional[str] = request.args.get('search', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(200, max(1, int(request.args.get('per_page', 50))))

        response = supabase.table("customers").select(
            "id, name, first_name, last_name, email, phone, archived_at, last_visit, last_inactive, visits, points, treatments, created_at"
        ).order("created_at", desc=True).execute()

        all_clients = response.data or []

        # Apply status computation
        enriched = []
        for c in all_clients:
            if c.get("archived_at"):
                c["status"] = "archived"
            elif _is_inactive_client(c):
                c["status"] = "inactive"
            else:
                c["status"] = "active"
            enriched.append(c)

        # Filter by status
        if status_filter and status_filter != 'all':
            enriched = [c for c in enriched if c["status"] == status_filter]

        # Apply search
        if search:
            sl = search.lower()
            def _matches(c: Dict[str, Any]) -> bool:
                full_name = (c.get("name") or
                             f"{c.get('first_name', '')} {c.get('last_name', '')}").lower()
                email = (c.get("email") or "").lower()
                phone = (c.get("phone") or "").lower()
                return sl in full_name or sl in email or sl in phone
            enriched = [c for c in enriched if _matches(c)]

        total = len(enriched)
        pages = max(1, (total + per_page - 1) // per_page)
        start = (page - 1) * per_page
        end = start + per_page
        page_items = enriched[start:end]

        return jsonify({
            "clients": page_items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }), 200

    except Exception as e:
        print(f"[REPORTS ERROR] get_clients_list: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch client list"}), 500


@reports_bp.route('/treatments/detail', methods=['GET'])
def get_treatment_detail():
    """
    Per-client treatment breakdown — each row is one client × one treatment.

    Query params:
        treatment_name: filter to a specific treatment (optional)
        status: "active" | "inactive" | "archived" | "all" (default "active")
        search: search by client name/email/phone

    Returns:
        List of {client_id, client_name, email, phone, status, treatment_name,
                 total_sessions, used_sessions, remaining_sessions,
                 completion_pct}
    """
    try:
        supabase = get_supabase_admin()

        treatment_filter = request.args.get('treatment_name', '').strip()
        status_filter = request.args.get('status', 'active')
        search = request.args.get('search', '').strip().lower()

        response = supabase.table("customers").select(
            "id, name, first_name, last_name, email, phone, archived_at, last_visit, last_inactive, treatments"
        ).execute()

        customers = response.data or []
        rows = []

        for c in customers:
            if c.get("archived_at"):
                c_status = "archived"
            elif _is_inactive_client(c):
                c_status = "inactive"
            else:
                c_status = "active"

            if status_filter != 'all' and c_status != status_filter:
                continue

            client_name = (c.get("name") or
                           f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or
                           "Unknown")

            if search:
                if (search not in client_name.lower() and
                        search not in (c.get("email") or "").lower() and
                        search not in (c.get("phone") or "").lower()):
                    continue

            treatments = c.get("treatments") or []
            for t in treatments:
                try:
                    t_name = t.get("name", "Unknown")
                    if treatment_filter and t_name.lower() != treatment_filter.lower():
                        continue
                    total = int(t.get("total_sessions", 0))
                    used = int(t.get("used_sessions", 0))
                    remaining = int(t.get("remaining_sessions", 0))
                    pct = round((used / total * 100) if total > 0 else 0, 1)
                    rows.append({
                        "client_id": c["id"],
                        "client_name": client_name,
                        "email": c.get("email") or "",
                        "phone": c.get("phone") or "",
                        "client_status": c_status,
                        "treatment_name": t_name,
                        "total_sessions": total,
                        "used_sessions": used,
                        "remaining_sessions": remaining,
                        "completion_pct": pct,
                    })
                except (ValueError, TypeError):
                    continue

        rows.sort(key=lambda r: (r["treatment_name"], r["client_name"]))
        return jsonify(rows), 200

    except Exception as e:
        print(f"[REPORTS ERROR] get_treatment_detail: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch treatment detail"}), 500


@reports_bp.route('/appointments/stats', methods=['GET'])
def get_appointment_stats():
    """
    Get overall appointment statistics focused on appointments and treatments.
    
    Returns:
        {
            "total_appointments": int,
            "completed_appointments": int,
            "upcoming_appointments": int,
            "cancelled_appointments": int,
            "completion_rate": float,
            "avg_appointments_per_client": float
        }
    """
    try:
        from datetime import timezone
        supabase = get_supabase_admin()
        
        # Fetch all appointments
        appts_resp = supabase.table("appointments").select("id, status, customer_id, start_time").execute()
        appointments = appts_resp.data or []
        
        # Categorize appointments by status
        total = len(appointments)
        completed = sum(1 for a in appointments if a.get("status") == "completed")
        cancelled = sum(1 for a in appointments if a.get("status") == "cancelled")
        
        # Count upcoming (not completed, not cancelled, and start_time is in future)
        now = datetime.now(timezone.utc)
        upcoming = 0
        for a in appointments:
            if a.get("status") not in ["completed", "cancelled"] and a.get("start_time"):
                try:
                    start_str = a["start_time"]
                    # Parse ISO format datetime
                    if isinstance(start_str, str):
                        start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    else:
                        continue
                    if start_time > now:
                        upcoming += 1
                except (ValueError, TypeError):
                    # Skip if datetime parsing fails
                    continue
        
        # Count unique clients
        unique_clients = len(set(a.get("customer_id") for a in appointments if a.get("customer_id")))
        avg_per_client = total / unique_clients if unique_clients > 0 else 0
        
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        print(f"[REPORTS] Appointment stats - Total: {total}, Completed: {completed}, Upcoming: {upcoming}, Cancelled: {cancelled}", file=sys.stderr)
        
        return jsonify({
            "total_appointments": total,
            "completed_appointments": completed,
            "upcoming_appointments": upcoming,
            "cancelled_appointments": cancelled,
            "completion_rate": round(completion_rate, 1),
            "avg_appointments_per_client": round(avg_per_client, 1),
        }), 200
        
    except Exception as e:
        print(f"[REPORTS ERROR] get_appointment_stats: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "message": "Failed to fetch appointment stats"}), 500


@reports_bp.route('/staff/appointments', methods=['GET'])
def get_staff_appointments():
    """
    Get staff member appointment statistics (appointments, treatments, completion rate).
    
    Query params:
        period: "daily" | "weekly" | "monthly" | "yearly" | "all" (default "all")
    
    Returns:
        List of {
            "staff_id": str,
            "staff_name": str,
            "total_appointments": int,
            "completed_appointments": int,
            "cancelled_appointments": int,
            "completion_rate": float,
            "unique_clients": int
        }
    """
    try:
        from datetime import timezone
        supabase = get_supabase_admin()
        period = request.args.get('period', 'all').lower()
        
        # Calculate date filter based on period
        now = datetime.now(timezone.utc)
        start_date = None
        
        if period == 'daily':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'weekly':
            start_date = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'monthly':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'yearly':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Build query for appointments
        query = supabase.table("appointments").select("staff_id, staff_name, status, customer_id, end_time")
        
        if start_date:
            query = query.gte("end_time", start_date.isoformat())
        
        appts_resp = query.execute()
        appointments = appts_resp.data or []
        
        staff_stats = {}
        for appt in appointments:
            staff_id = appt.get("staff_id")
            staff_name = appt.get("staff_name") or "Unknown Staff"
            status = appt.get("status", "")
            customer_id = appt.get("customer_id")
            
            if not staff_id:
                continue
            
            if staff_id not in staff_stats:
                staff_stats[staff_id] = {
                    "staff_id": staff_id,
                    "staff_name": staff_name,
                    "total_appointments": 0,
                    "completed_appointments": 0,
                    "cancelled_appointments": 0,
                    "_client_ids": set(),
                }
            
            staff_stats[staff_id]["total_appointments"] += 1
            if customer_id:
                staff_stats[staff_id]["_client_ids"].add(customer_id)
            
            if status == "completed":
                staff_stats[staff_id]["completed_appointments"] += 1
            elif status == "cancelled":
                staff_stats[staff_id]["cancelled_appointments"] += 1
        
        # Calculate completion rates and format for response
        result = []
        for stats in staff_stats.values():
            total = stats["total_appointments"]
            completed = stats["completed_appointments"]
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            result.append({
                "staff_id": stats["staff_id"],
                "staff_name": stats["staff_name"],
                "total_appointments": total,
                "completed_appointments": completed,
                "cancelled_appointments": stats["cancelled_appointments"],
                "completion_rate": round(completion_rate, 1),
                "unique_clients": len(stats["_client_ids"]),
            })
        
        # Sort by total appointments descending
        result.sort(key=lambda x: x["total_appointments"], reverse=True)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[REPORTS ERROR] get_staff_appointments: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch staff appointments"}), 500


@reports_bp.route('/export/csv', methods=['GET'])
def export_report_csv():
    """
    Export report data as CSV text.

    Args:
        report_type: "full" | "clients" | "treatments" | "clients_all" | "treatment_detail"

    Returns:
        JSON with csv content and filename
    """
    try:
        report_type = request.args.get('report_type', 'full')
        supabase = get_supabase_admin()

        csv_lines = []

        if report_type == "clients_all":
            # All clients with status
            response = supabase.table("customers").select(
                "id, name, first_name, last_name, email, phone, archived_at, last_visit, last_inactive, visits, points, created_at"
            ).order("created_at", desc=True).execute()
            customers = response.data or []

            csv_lines.append("ALL CLIENTS REPORT")
            csv_lines.append(f"Generated,{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            csv_lines.append("")
            csv_lines.append("Name,Email,Phone,Status,Visits,Points,Last Visit,Created")
            for c in customers:
                if c.get("archived_at"):
                    c_status = "Archived"
                elif _is_inactive_client(c):
                    c_status = "Inactive"
                else:
                    c_status = "Active"
                name = c.get("name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
                last_visit = (c.get("last_visit") or "")[:10]
                created = (c.get("created_at") or "")[:10]
                csv_lines.append(
                    f'"{name}","{c.get("email", "")}","{c.get("phone", "")}",'
                    f'"{c_status}",{c.get("visits", 0)},{c.get("points", 0)},'
                    f'"{last_visit}","{created}"'
                )

            csv_content = "\n".join(csv_lines)
            filename = f"clients_all_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            return jsonify({"csv": csv_content, "filename": filename}), 200

        if report_type == "treatment_detail":
            response = supabase.table("customers").select(
                "id, name, first_name, last_name, email, phone, archived_at, last_visit, last_inactive, treatments"
            ).execute()
            customers = response.data or []

            csv_lines.append("TREATMENT DETAIL REPORT")
            csv_lines.append(f"Generated,{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            csv_lines.append("")
            csv_lines.append("Client Name,Email,Phone,Client Status,Treatment,Total Sessions,Used Sessions,Remaining Sessions,Completion %")

            for c in customers:
                if c.get("archived_at"):
                    c_status = "Archived"
                elif _is_inactive_client(c):
                    c_status = "Inactive"
                else:
                    c_status = "Active"
                client_name = c.get("name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or "Unknown"
                for t in (c.get("treatments") or []):
                    try:
                        total = int(t.get("total_sessions", 0))
                        used = int(t.get("used_sessions", 0))
                        remaining = int(t.get("remaining_sessions", 0))
                        pct = round((used / total * 100) if total > 0 else 0, 1)
                        csv_lines.append(
                            f'"{client_name}","{c.get("email", "")}","{c.get("phone", "")}",'
                            f'"{c_status}","{t.get("name", "Unknown")}",'
                            f'{total},{used},{remaining},{pct}'
                        )
                    except (ValueError, TypeError):
                        continue

            csv_content = "\n".join(csv_lines)
            filename = f"treatment_detail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            return jsonify({"csv": csv_content, "filename": filename}), 200

        if report_type in ["full", "clients"]:
            # Fetch client counts
            counts_response = supabase.table("customers").select(
                "id, archived_at, last_visit, last_inactive, name, first_name, last_name, email, phone, visits, points"
            ).execute()
            customers = counts_response.data or []
            
            active_count = 0
            inactive_count = 0
            archived_count = 0
            
            for customer in customers:
                if customer.get("archived_at"):
                    archived_count += 1
                elif _is_inactive_client(customer):
                    inactive_count += 1
                else:
                    active_count += 1
            
            # Client counts section
            csv_lines.append("CLIENT SUMMARY REPORT")
            csv_lines.append(f"Generated,{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            csv_lines.append("")
            
            csv_lines.append("Client Status,Count")
            csv_lines.append(f"Active,{active_count}")
            csv_lines.append(f"Inactive,{inactive_count}")
            csv_lines.append(f"Archived,{archived_count}")
            csv_lines.append(f"Total,{len(customers)}")
            csv_lines.append("")
            
            # Archived clients list
            archived_response = supabase.table("customers").select(
                "id, name, first_name, last_name, email, phone, archived_at, visits, points"
            ).not_.is_("archived_at", "null").order("archived_at", desc=True).execute()
            
            archived_clients = archived_response.data or []
            if archived_clients:
                csv_lines.append("ARCHIVED CLIENTS")
                csv_lines.append("Name,Email,Phone,Visits,Points,Archived Date")
                for client in archived_clients:
                    name = client.get("name") or f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
                    email = client.get("email", "")
                    phone = client.get("phone", "")
                    visits = client.get("visits", 0)
                    points = client.get("points", 0)
                    archived_at = client.get("archived_at", "")
                    
                    csv_lines.append(
                        f'"{name}","{email}","{phone}",{visits},{points},"{archived_at[:10] if archived_at else ""}"'
                    )
            csv_lines.append("")
        
        if report_type in ["full", "treatments"]:
            # Treatment summary section - use same logic as /reports/treatments/summary
            services_resp = supabase.table("services").select("id, name, session_count").eq("is_package", True).execute()
            package_services: Dict[str, Any] = {s["id"]: s for s in (services_resp.data or [])}
            
            treatment_map: Dict[str, Any] = {}
            
            if package_services:
                # Fetch all non-cancelled appointments with service_ids and status
                appts_resp = supabase.table("appointments").select(
                    "id, customer_id, service_ids, status"
                ).neq("status", "cancelled").execute()
                appointments = appts_resp.data or []
                
                for appt in appointments:
                    service_ids = appt.get("service_ids") or []
                    customer_id = appt.get("customer_id")
                    status = appt.get("status", "")
                    
                    for svc_id in service_ids:
                        if svc_id not in package_services:
                            continue
                        
                        name = package_services[svc_id]["name"]
                        
                        if name not in treatment_map:
                            treatment_map[name] = {
                                "treatment_name": name,
                                "_client_ids": set(),
                                "total_sessions": 0,
                                "used_sessions": 0,
                                "remaining_sessions": 0,
                            }
                        
                        treatment_map[name]["total_sessions"] += 1
                        if customer_id:
                            treatment_map[name]["_client_ids"].add(customer_id)
                        if status == "completed":
                            treatment_map[name]["used_sessions"] += 1
                        else:
                            treatment_map[name]["remaining_sessions"] += 1
            
            csv_lines.append("TREATMENT SUMMARY REPORT")
            csv_lines.append("")
            csv_lines.append("Treatment Type,Clients,Total Sessions,Used Sessions,Remaining Sessions")
            
            for v in treatment_map.values():
                csv_lines.append(
                    f'"{v["treatment_name"]}",'
                    f'{len(v["_client_ids"])},'
                    f'{v["total_sessions"]},'
                    f'{v["used_sessions"]},'
                    f'{v["remaining_sessions"]}'
                )
            csv_lines.append("")

        if report_type in ["full", "staff_sales"]:
            # Staff sales section - use same logic as /reports/staff/sales but for all time
            services_resp = supabase.table("services").select("id, price").execute()
            services_map = {s["id"]: float(s.get("price") or 0) for s in (services_resp.data or [])}

            appts_resp = supabase.table("appointments").select("staff_id, staff_name, service_ids").eq("status", "completed").execute()
            appointments = appts_resp.data or []

            staff_sales = {}
            for appt in appointments:
                staff_id = appt.get("staff_id")
                staff_name = appt.get("staff_name") or "Unknown Staff"
                service_ids = appt.get("service_ids") or []
                
                if not staff_id: continue
                    
                if staff_id not in staff_sales:
                    staff_sales[staff_id] = {"name": staff_name, "total": 0.0, "count": 0}
                
                appt_total = sum(services_map.get(s_id, 0.0) for s_id in service_ids)
                staff_sales[staff_id]["total"] += appt_total
                staff_sales[staff_id]["count"] += 1
            
            # Sort by total sales descending
            sorted_staff = sorted(staff_sales.values(), key=lambda x: x["total"], reverse=True)

            csv_lines.append("STAFF SALES SUMMARY")
            csv_lines.append("Staff Name,Appointments,Total Sales")
            for s in sorted_staff:
                csv_lines.append(f'"{s["name"]}",{s["count"]},{s["total"]}')
            csv_lines.append("")

        csv_content = "\n".join(csv_lines)
        
        filename = f"report_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        print(f"[REPORTS] Generated CSV export: {filename} ({len(csv_lines)} lines)", file=sys.stderr)
        
        return jsonify({
            "csv": csv_content,
            "filename": filename
        }), 200
    
    except Exception as e:
        print(f"[REPORTS ERROR] export_report_csv: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to export CSV"}), 500


@reports_bp.route('/staff/top-sales', methods=['GET'])
def get_top_staff_sales():
    """
    Get the staff member with the highest sales based on completed appointments.
    
    Returns:
        {
            "staff_id": str,
            "staff_name": str,
            "total_sales": float,
            "completed_appointments": int
        }
    """
    try:
        supabase = get_supabase_admin()
        
        # Fetch all services to get their prices
        services_resp = supabase.table("services").select("id, price").execute()
        services_map = {s["id"]: float(s.get("price") or 0) for s in (services_resp.data or [])}

        # Fetch all completed appointments
        appts_resp = supabase.table("appointments").select("staff_id, staff_name, service_ids").eq("status", "completed").execute()
        appointments = appts_resp.data or []

        staff_sales = {}
        for appt in appointments:
            staff_id = appt.get("staff_id")
            staff_name = appt.get("staff_name") or "Unknown Staff"
            service_ids = appt.get("service_ids") or []
            
            if not staff_id:
                continue
                
            if staff_id not in staff_sales:
                staff_sales[staff_id] = {
                    "staff_id": staff_id, 
                    "staff_name": staff_name, 
                    "total_sales": 0.0, 
                    "completed_appointments": 0
                }
            
            appt_total = sum(services_map.get(s_id, 0.0) for s_id in service_ids)
            staff_sales[staff_id]["total_sales"] += appt_total
            staff_sales[staff_id]["completed_appointments"] += 1

        if not staff_sales:
            print("[REPORTS] No completed appointments found to calculate top staff sales", file=sys.stderr)
            return jsonify(None), 200

        # Find the staff member with the highest total_sales
        top_staff = max(staff_sales.values(), key=lambda x: x["total_sales"])
        
        print(f"[REPORTS] Top staff sales: {top_staff['staff_name']} with {top_staff['total_sales']}", file=sys.stderr)
        return jsonify(top_staff), 200
        
    except Exception as e:
        print(f"[REPORTS ERROR] get_top_staff_sales: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch top staff sales"}), 500


@reports_bp.route('/staff/sales', methods=['GET'])
def get_staff_sales_list():
    """
    Get all staff sales, filtered by an optional period parameter.
    
    Query params:
        period: "daily" | "weekly" | "monthly" | "yearly" | "all" (default "all")
        
    Returns:
        List of {
            "staff_id": str,
            "staff_name": str,
            "total_sales": float,
            "completed_appointments": int
        }
    """
    try:
        from datetime import timezone
        supabase = get_supabase_admin()
        period = request.args.get('period', 'all').lower()
        
        # Calculate date filter based on period
        now = datetime.now(timezone.utc)
        start_date = None
        
        if period == 'daily':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'weekly':
            # Start of week (Monday)
            start_date = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'monthly':
            # Start of month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'yearly':
            # Start of year
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            
        # Fetch all services to get their prices
        services_resp = supabase.table("services").select("id, price").execute()
        services_map = {s["id"]: float(s.get("price") or 0) for s in (services_resp.data or [])}

        # Build query for appointments
        query = supabase.table("appointments").select("staff_id, staff_name, service_ids, end_time").eq("status", "completed")
        
        if start_date:
            query = query.gte("end_time", start_date.isoformat())
            
        appts_resp = query.execute()
        appointments = appts_resp.data or []

        staff_sales = {}
        for appt in appointments:
            staff_id = appt.get("staff_id")
            staff_name = appt.get("staff_name") or "Unknown Staff"
            service_ids = appt.get("service_ids") or []
            
            if not staff_id:
                continue
                
            if staff_id not in staff_sales:
                staff_sales[staff_id] = {
                    "staff_id": staff_id, 
                    "staff_name": staff_name, 
                    "total_sales": 0.0, 
                    "completed_appointments": 0
                }
            
            appt_total = sum(services_map.get(s_id, 0.0) for s_id in service_ids)
            staff_sales[staff_id]["total_sales"] += appt_total
            staff_sales[staff_id]["completed_appointments"] += 1

        # Convert to list and sort by total_sales descending
        result = list(staff_sales.values())
        result.sort(key=lambda x: x["total_sales"], reverse=True)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[REPORTS ERROR] get_staff_sales_list: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Failed to fetch staff sales array"}), 500

