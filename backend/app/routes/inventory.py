"""
Inventory Routes
================

Handles inventory product management, stock levels, and inter-branch stock transfers.
"""

from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, request, jsonify

from app.services.supabase_client import get_supabase_admin
from app.routes.accounts import get_user_from_token

inventory_bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")


@inventory_bp.route("/products", methods=["GET"])
def list_products():
    """List all inventory products (visible to authenticated users)."""
    try:
        get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    res = supabase.table("inventory_products").select("*").order("name").execute()
    
    return jsonify(res.data or []), 200


@inventory_bp.route("/products", methods=["POST"])
def create_product():
    """Create a new inventory product (super_admin only)."""
    try:
        user = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    # Get user profile to check role
    supabase = get_supabase_admin()
    user_res = supabase.table("user_profiles").select("role").eq("id", user).single().execute()
    
    if user_res.data.get("role") != "super_admin":
        return jsonify({"error": "Only super_admins can create products"}), 403

    data = request.json or {}
    
    try:
        res = supabase.table("inventory_products").insert({
            "name": data.get("name"),
            "description": data.get("description"),
            "sku": data.get("sku"),
            "category": data.get("category"),
            "unit_price": data.get("unit_price"),
            "min_stock_level": data.get("min_stock_level", 0),
            "max_stock_level": data.get("max_stock_level", 100),
            "reorder_level": data.get("reorder_level", 10),
            "danger_level": data.get("danger_level", 5),
        }).execute()
        
        return jsonify(res.data[0] if res.data else {}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@inventory_bp.route("/transfers", methods=["GET"])
def list_transfers():
    """
    List stock transfers visible to the user.
    - super_admin: sees all
    - branch_admin/staff: sees transfers for their branch
    """
    try:
        user_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    
    # Get user profile
    user_res = supabase.table("user_profiles").select("role, branch_id").eq("id", user_id).single().execute()
    user_role = user_res.data.get("role")
    user_branch = user_res.data.get("branch_id")

    # Build query
    query = supabase.table("inventory_transfers").select(
        "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason, "
        "product:inventory_products(id, name, sku), "
        "from_branch:branches!from_branch_id(id, name), "
        "to_branch:branches!to_branch_id(id, name), "
        "initiator:user_profiles!initiated_by(full_name), "
        "receiver:user_profiles!received_by(full_name)"
    )

    if user_role != "super_admin":
        # Filter: user's branch as sender or receiver
        query = query.or_(f"from_branch_id.eq.{user_branch},to_branch_id.eq.{user_branch}")

    # Order by most recent first
    query = query.order("created_at", ascending=False)
    
    try:
        res = query.execute()
        return jsonify(res.data or []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@inventory_bp.route("/transfers", methods=["POST"])
def create_transfer():
    """
    Initiate a stock transfer from one branch to another.
    User must be super_admin or branch_admin of the sending branch.
    """
    try:
        user_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    
    # Get user profile
    user_res = supabase.table("user_profiles").select("role, branch_id").eq("id", user_id).single().execute()
    user_role = user_res.data.get("role")
    user_branch = user_res.data.get("branch_id")

    data = request.json or {}
    from_branch_id = data.get("from_branch_id")
    to_branch_id = data.get("to_branch_id")
    product_id = data.get("product_id")
    quantity = data.get("quantity")
    reason = data.get("reason", "Stock transfer")

    # Validate authorization
    if user_role not in ["super_admin", "branch_admin"]:
        return jsonify({"error": "Only super_admins and branch_admins can create transfers"}), 403
    
    if user_role == "branch_admin" and user_branch != from_branch_id:
        return jsonify({"error": "Branch admins can only transfer from their own branch"}), 403

    # Validate input
    if not all([from_branch_id, to_branch_id, product_id, quantity]):
        return jsonify({"error": "Missing required fields"}), 400
    
    if from_branch_id == to_branch_id:
        return jsonify({"error": "Cannot transfer to the same branch"}), 400
    
    try:
        quantity = int(quantity)
        if quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid quantity"}), 400

    try:
        # Check source stock availability
        stock_res = supabase.table("inventory_stocks").select("quantity").eq(
            "product_id", product_id
        ).eq("branch_id", from_branch_id).single().execute()

        if not stock_res.data:
            return jsonify({"error": "Product not in stock at origin branch"}), 404
        
        available = stock_res.data.get("quantity", 0)
        if available < quantity:
            return jsonify({
                "error": f"Insufficient stock. Available: {available}, Requested: {quantity}"
            }), 400

        # Create transfer
        transfer_res = supabase.table("inventory_transfers").insert({
            "product_id": product_id,
            "from_branch_id": from_branch_id,
            "to_branch_id": to_branch_id,
            "quantity": quantity,
            "status": "pending",
            "initiated_by": user_id,
            "reason": reason,
        }).execute()

        if not transfer_res.data:
            return jsonify({"error": "Failed to create transfer"}), 400

        transfer = transfer_res.data[0]
        
        # Fetch full transfer details for response
        full_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason, "
            "product:inventory_products(id, name, sku), "
            "from_branch:branches!from_branch_id(id, name), "
            "to_branch:branches!to_branch_id(id, name), "
            "initiator:user_profiles!initiated_by(full_name)"
        ).eq("id", transfer["id"]).single().execute()

        return jsonify(full_res.data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@inventory_bp.route("/transfers/<transfer_id>/approve", methods=["POST"])
def approve_transfer(transfer_id):
    """
    Approve a pending transfer (mark as in_transit).
    Sending branch admin or super_admin can approve.
    """
    try:
        user_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    
    # Get user profile
    user_res = supabase.table("user_profiles").select("role, branch_id").eq("id", user_id).single().execute()
    user_role = user_res.data.get("role")
    user_branch = user_res.data.get("branch_id")

    try:
        # Get transfer
        transfer_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason"
        ).eq("id", transfer_id).single().execute()
        transfer = transfer_res.data

        # Check authorization
        if user_role not in ["super_admin", "branch_admin"]:
            return jsonify({"error": "Unauthorized"}), 403
        
        if user_role == "branch_admin" and user_branch != transfer["from_branch_id"]:
            return jsonify({"error": "Only sending branch admin can approve transfers"}), 403

        if transfer["status"] != "pending":
            return jsonify({"error": f"Cannot approve transfer with status: {transfer['status']}"}), 400

        # Update status
        update_res = supabase.table("inventory_transfers").update({
            "status": "in_transit",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", transfer_id).execute()

        # Fetch full transfer details for response
        full_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason, "
            "product:inventory_products(id, name, sku), "
            "from_branch:branches!from_branch_id(id, name), "
            "to_branch:branches!to_branch_id(id, name), "
            "initiator:user_profiles!initiated_by(full_name)"
        ).eq("id", transfer_id).single().execute()

        return jsonify(full_res.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@inventory_bp.route("/transfers/<transfer_id>/receive", methods=["POST"])
def receive_transfer(transfer_id):
    """
    Receive a transfer (mark as received and update stock).
    Receiving branch admin or super_admin can receive.
    """
    try:
        user_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    
    # Get user profile
    user_res = supabase.table("user_profiles").select("role, branch_id").eq("id", user_id).single().execute()
    user_role = user_res.data.get("role")
    user_branch = user_res.data.get("branch_id")

    try:
        # Get transfer
        transfer_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason"
        ).eq("id", transfer_id).single().execute()
        transfer = transfer_res.data

        # Check authorization
        if user_role not in ["super_admin", "branch_admin"]:
            return jsonify({"error": "Unauthorized"}), 403
        
        if user_role == "branch_admin" and user_branch != transfer["to_branch_id"]:
            return jsonify({"error": "Only receiving branch admin can receive transfers"}), 403

        if transfer["status"] not in ["pending", "in_transit"]:
            return jsonify({"error": f"Cannot receive transfer with status: {transfer['status']}"}), 400

        # Update status and received_by - the trigger will handle stock updates
        update_res = supabase.table("inventory_transfers").update({
            "status": "received",
            "received_by": user_id,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", transfer_id).execute()

        # Fetch full transfer details for response
        full_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason, "
            "product:inventory_products(id, name, sku), "
            "from_branch:branches!from_branch_id(id, name), "
            "to_branch:branches!to_branch_id(id, name), "
            "initiator:user_profiles!initiated_by(full_name), "
            "receiver:user_profiles!received_by(full_name)"
        ).eq("id", transfer_id).single().execute()

        return jsonify(full_res.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@inventory_bp.route("/transfers/<transfer_id>/cancel", methods=["POST"])
def cancel_transfer(transfer_id):
    """
    Cancel a transfer (can be done if status is pending or in_transit).
    Sending branch admin or super_admin can cancel.
    """
    try:
        user_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    
    # Get user profile
    user_res = supabase.table("user_profiles").select("role, branch_id").eq("id", user_id).single().execute()
    user_role = user_res.data.get("role")
    user_branch = user_res.data.get("branch_id")

    data = request.json or {}
    cancellation_reason = data.get("reason", "No reason provided")

    try:
        # Get transfer
        transfer_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason"
        ).eq("id", transfer_id).single().execute()
        transfer = transfer_res.data

        # Check authorization
        if user_role not in ["super_admin", "branch_admin"]:
            return jsonify({"error": "Unauthorized"}), 403
        
        if user_role == "branch_admin" and user_branch != transfer["from_branch_id"]:
            return jsonify({"error": "Only sending branch admin can cancel transfers"}), 403

        if transfer["status"] == "cancelled":
            return jsonify({"error": "Transfer is already cancelled"}), 400
        
        if transfer["status"] == "received":
            return jsonify({"error": "Cannot cancel a received transfer"}), 400

        # Update status
        update_res = supabase.table("inventory_transfers").update({
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancellation_reason": cancellation_reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", transfer_id).execute()

        # Fetch full transfer details for response
        full_res = supabase.table("inventory_transfers").select(
            "id, from_branch_id, to_branch_id, product_id, quantity, status, reason, created_at, updated_at, initiated_by, received_by, received_at, cancelled_at, cancellation_reason, "
            "product:inventory_products(id, name, sku), "
            "from_branch:branches!from_branch_id(id, name), "
            "to_branch:branches!to_branch_id(id, name), "
            "initiator:user_profiles!initiated_by(full_name)"
        ).eq("id", transfer_id).single().execute()

        return jsonify(full_res.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
