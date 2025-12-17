from flask import Blueprint, request, jsonify
from email_validator import validate_email, EmailNotValidError
from app.services.auth_service import register_user, authenticate_user, create_access_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get("email")
        password = data.get("password")
        name = data.get("name")

        if not email or not password or not name:
            return jsonify({"error": "Missing required fields: email, password, name"}), 400

        # Validate email format
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({"error": "Invalid email format"}), 400

        # Register user
        user = register_user(email, password, name)

        if not user:
            return jsonify({"error": "Email already registered"}), 400

        access_token = create_access_token({"sub": user["id"], "email": user["email"]})

        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "created_at": user["created_at"]
            }
        }), 201

    except Exception as e:
        return jsonify({"error": f"Register error: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return access token"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Missing required fields: email, password"}), 400

        # Authenticate user
        user = authenticate_user(email, password)

        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        access_token = create_access_token({"sub": user["id"], "email": user["email"]})

        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "created_at": user["created_at"]
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Login error: {str(e)}"}), 500
