"""
POS / Transactions Routes
========================

Handles Point-of-Sale transaction creation, listing, and receipt generation.
The routes enforce branch scoping based on user role:
- super_admin: can access all branches
- branch_admin / staff: limited to their own branch

This is intentionally kept simple; in the future you can add
`void`, `refund`, and `transaction reporting` endpoints.
"""

from datetime import datetime, timezone
import uuid
from decimal import Decimal, ROUND_HALF_UP

from flask import Blueprint, request, jsonify

from app.services.supabase_client import get_supabase_admin
from app.routes.accounts import get_user_from_token

pos_bp = Blueprint("pos", __name__, url_prefix="/api/pos")


def _to_decimal(value, default=Decimal(0)):
    try:
        if value is None or value == "":
            return default
        return Decimal(str(value))
    except Exception:
        return default


def _calc_vat_values(subtotal: Decimal, discount_amount: Decimal):
    """Compute BIR-style VAT breakdown.

    Assumes prices are VAT-inclusive (12%).
    """
    total_due = (subtotal - discount_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Vatable sales is the portion of the total due that is subject to VAT
    # (i.e. total_due / 1.12)
    vatable_sales = (total_due / Decimal("1.12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # VAT portion is the remainder
    vat_amount = (total_due - vatable_sales).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # VAT-exempt sales is the discount amount (per BIR SC/PWD rules)
    vat_exempt_sales = discount_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "total_due": total_due,
        "vatable_sales": vatable_sales,
        "vat_amount": vat_amount,
        "vat_exempt_sales": vat_exempt_sales,
    }


@pos_bp.route("/transactions", methods=["POST"])
def create_transaction():
    """Create a POS transaction (receipt) and associated line items.

    Expected request body:
    {
      "branch_id": "...",                # optional (staff/branch_admin forced to their branch)
      "appointment_id": "...",           # optional, to link to an appointment
      "customer_id": "...",              # optional
      "payment_method": "cash",          # optional
      "subtotal": 100.00,
      "discount_amount": 0.00,
      "amount_paid": 100.00,
      "items": [
        {
          "service_id": "...",           # optional
          "inventory_product_id": "...", # optional
          "description": "Service name or product",
          "quantity": 1,
          "unit_price": 100.00,
          "line_total": 100.00
        }
      ]
    }

    Returns the created transaction + items.
    """

    try:
        caller_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    payload = request.get_json(force=True, silent=True) or {}

    supabase = get_supabase_admin()

    # Load caller role/branch for authorization
    caller_profile = supabase.table("user_profiles").select("role, branch_id").eq("id", caller_id).single().execute()
    if not caller_profile.data:
        return jsonify({"error": "Caller profile not found"}), 404

    caller_role = caller_profile.data.get("role")
    caller_branch_id = caller_profile.data.get("branch_id")

    # Determine branch for this transaction
    branch_id = payload.get("branch_id") or caller_branch_id
    if not branch_id:
        return jsonify({"error": "Branch ID is required"}), 400

    # Enforce branch scoping for non-super-admins
    if caller_role in ["branch_admin", "staff"] and branch_id != caller_branch_id:
        return jsonify({"error": "Forbidden: branch mismatch"}), 403

    # Generate next receipt/sequence for this branch (atomic inside Postgres)
    try:
        seq_resp = supabase.rpc("next_pos_receipt_sequence", {"p_branch_id": branch_id}).execute()
    except Exception as e:
        return jsonify({"error": "Failed to generate receipt sequence", "details": str(e)}), 500

    # RPC result can be scalar, list, or wrapped dict depending on runtime.
    if isinstance(seq_resp.data, list):
        raw_seq = seq_resp.data[0] if seq_resp.data else None
    else:
        raw_seq = seq_resp.data

    if isinstance(raw_seq, dict):
        # Handle wrapped RPC shape, e.g. {"next_pos_receipt_sequence": 1}
        receipt_sequence = next(iter(raw_seq.values()), None)
    else:
        receipt_sequence = raw_seq

    if receipt_sequence is None:
        return jsonify({"error": "Failed to generate receipt sequence", "details": "No sequence returned"}), 500

    # Load receipt prefix from settings (optional). Missing row should not fail checkout.
    try:
        prefix_resp = (
            supabase
            .table("business_settings")
            .select("receipt_prefix")
            .eq("id", "default")
            .maybe_single()
            .execute()
        )
        receipt_prefix = (prefix_resp.data or {}).get("receipt_prefix") or ""
    except Exception:
        receipt_prefix = ""
    receipt_number = f"{receipt_prefix}{str(receipt_sequence).zfill(6)}"

    # Compute BIR-related totals (VAT breakdown)
    subtotal = _to_decimal(payload.get("subtotal"), Decimal(0))
    discount_amount = _to_decimal(payload.get("discount_amount"), Decimal(0))
    amount_paid = _to_decimal(payload.get("amount_paid"), Decimal(0))

    totals = _calc_vat_values(subtotal, discount_amount)

    transaction_id = str(uuid.uuid4())

    transaction_payload = {
        "id": transaction_id,
        "branch_id": branch_id,
        "appointment_id": payload.get("appointment_id"),
        "staff_id": caller_id,
        "customer_id": payload.get("customer_id"),
        "receipt_prefix": receipt_prefix,
        "receipt_sequence": receipt_sequence,
        "receipt_number": receipt_number,
        "status": payload.get("status", "completed"),
        "payment_method": payload.get("payment_method"),
        "subtotal": float(subtotal),
        "discount_amount": float(discount_amount),
        "vatable_sales": float(totals["vatable_sales"]),
        "vat_amount": float(totals["vat_amount"]),
        "vat_exempt_sales": float(totals["vat_exempt_sales"]),
        "total_due": float(totals["total_due"]),
        "amount_paid": float(amount_paid),
        "change_amount": float((amount_paid - totals["total_due"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "notes": payload.get("notes"),
        "created_by": caller_id,
    }

    # Insert transaction
    try:
        tx_resp = supabase.table("transactions").insert(transaction_payload).execute()
    except Exception as e:
        return jsonify({"error": "Failed to create transaction", "details": str(e)}), 500

    # Insert line items
    items = payload.get("items") or []
    inserted_items = []

    # Preload service -> inventory_product_id mapping for any service-based items
    service_ids = [i.get("service_id") for i in items if i.get("service_id")]
    service_map = {}

    if service_ids:
        try:
            svc_resp = supabase.table("services").select("id, inventory_product_id").in_("id", service_ids).execute()
        except Exception as e:
            return jsonify({"error": "Failed to load service metadata", "details": str(e)}), 500

        for svc in svc_resp.data or []:
            service_map[svc.get("id")] = svc.get("inventory_product_id")

    for item in items:
        item_id = str(uuid.uuid4())

        inventory_product_id = item.get("inventory_product_id") or service_map.get(item.get("service_id"))

        item_payload = {
            "id": item_id,
            "transaction_id": transaction_id,
            "service_id": item.get("service_id"),
            "inventory_product_id": inventory_product_id,
            "description": item.get("description") or "",
            "quantity": float(item.get("quantity") or 1),
            "unit_price": float(item.get("unit_price") or 0),
            "line_total": float(item.get("line_total") or 0),
        }

        try:
            supabase.table("transaction_items").insert(item_payload).execute()
        except Exception as e:
            return jsonify({"error": "Failed to insert transaction item", "details": str(e)}), 500

        inserted_items.append(item_payload)

        # Adjust inventory if this item references an inventory product
        if inventory_product_id:
            try:
                # 1) Fetch current stock
                stock_resp = (
                    supabase
                    .table("inventory_stocks")
                    .select("*")
                    .eq("product_id", inventory_product_id)
                    .eq("branch_id", branch_id)
                    .maybe_single()
                    .execute()
                )

                current_qty = 0
                if stock_resp.data:
                    current_qty = stock_resp.data.get("quantity", 0) or 0

                new_qty = int(current_qty) - int(item_payload["quantity"])

                # 2) Upsert new stock quantity
                upsert_resp = supabase.table("inventory_stocks").upsert({
                    "product_id": inventory_product_id,
                    "branch_id": branch_id,
                    "quantity": new_qty,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }, on_conflict="product_id,branch_id").execute()

                # 3) Log inventory transaction
                log_resp = supabase.table("inventory_transactions").insert({
                    "id": str(uuid.uuid4()),
                    "product_id": inventory_product_id,
                    "branch_id": branch_id,
                    "type": "out",
                    "quantity": int(item_payload["quantity"]),
                    "reason": "sale",
                }).execute()

            except Exception as inv_err:
                # Log error but do not stop the transaction creation.
                print(f"[POS] Inventory update error: {inv_err}")

    return jsonify({
        "success": True,
        "transaction": tx_resp.data[0] if tx_resp.data else None,
        "items": inserted_items,
    }), 201


@pos_bp.route("/transactions", methods=["GET"])
def list_transactions():
    """List POS transactions, scoped to the current user's branch (unless super_admin)."""
    try:
        caller_id = get_user_from_token()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    supabase = get_supabase_admin()
    caller_profile = supabase.table("user_profiles").select("role, branch_id").eq("id", caller_id).single().execute()
    if not caller_profile.data:
        return jsonify({"error": "Caller profile not found"}), 404

    caller_role = caller_profile.data.get("role")
    caller_branch_id = caller_profile.data.get("branch_id")

    query = supabase.table("transactions").select("*").order("created_at", desc=True)

    if caller_role in ["branch_admin", "staff"]:
        if not caller_branch_id:
            return jsonify({"transactions": []}), 200
        query = query.eq("branch_id", caller_branch_id)

    try:
        resp = query.limit(200).execute()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"transactions": resp.data or []}), 200
