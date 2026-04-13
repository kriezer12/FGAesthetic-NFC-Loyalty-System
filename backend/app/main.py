"""
Flask Application Entry Point
=============================

Main application factory and server entry point.
Uses the factory pattern for better testing and configuration.

Endpoints:
- GET /         : API information
- GET /health   : Health check for monitoring
"""

import sys
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import config


def create_app() -> Flask:
    """
    Application factory function.
    
    Creates and configures the Flask application with:
    - CORS support for frontend communication
    - Health check endpoint
    - API information endpoint
    
    Returns:
        Flask: Configured Flask application instance.
    """
    app = Flask(__name__)
    
    # Validate configuration
    print("[APP] Validating configuration...", file=sys.stderr)
    config.validate()

    # Configure CORS for frontend communication
    cors_origins = [
        config.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://fgaesthetic-frontend:5173",  # Docker container hostname
    ]
    print(f"[APP] CORS Origins: {cors_origins}", file=sys.stderr)
    
    CORS(
        app,
        origins=cors_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Register blueprints
    from app.routes.accounts import accounts_bp
    from app.routes.reports import reports_bp
    from app.routes.pos import pos_bp
    from app.routes.staff import staff_bp
    from app.routes.customer_auth import customer_auth_bp
    
    app.register_blueprint(accounts_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(pos_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(customer_auth_bp)

    # ==================== Routes ====================

    @app.route("/health", methods=["GET"])
    def health():
        """Health check endpoint for monitoring and load balancers."""
        return jsonify({"status": "healthy"}), 200

    @app.route("/", methods=["GET"])
    def root():
        """Root endpoint - returns API information."""
        return jsonify({
            "name": "FG Aesthetic NFC Loyalty System API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "health": "/health",
            }
        }), 200

    # TODO: Register additional blueprints here
    # from app.routes.loyalty import loyalty_bp
    # app.register_blueprint(loyalty_bp)

    return app


# ==================== Entry Point ====================

if __name__ == "__main__":
    print("[APP] Starting FG Aesthetic NFC Loyalty System API...", file=sys.stderr)
    print(f"[APP] SUPABASE_URL: {'✓ Set' if config.SUPABASE_URL else '✗ MISSING'}", file=sys.stderr)
    print(f"[APP] SUPABASE_KEY: {'✓ Set' if config.SUPABASE_KEY else '✗ MISSING'}", file=sys.stderr)
    print(f"[APP] SUPABASE_SERVICE_KEY: {'✓ Set' if config.SUPABASE_SERVICE_KEY else '✗ MISSING'}", file=sys.stderr)
    
    app = create_app()
    print("[APP] Application initialized successfully!", file=sys.stderr)
    print("[APP] Listening on http://0.0.0.0:5000", file=sys.stderr)
    app.run(host="0.0.0.0", port=5000, debug=True)
