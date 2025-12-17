from flask import Flask, jsonify
from flask_cors import CORS
from app.config import config
from app.routes.auth import auth_bp


def create_app():
    """Create and configure Flask app"""
    app = Flask(__name__)

    # CORS
    CORS(
        app,
        origins=[config.FRONTEND_URL, "http://localhost:5173"],
        supports_credentials=True
    )

    # Register blueprints
    app.register_blueprint(auth_bp)

    # Health check
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy"}), 200

    # Root endpoint
    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "message": "FG Aesthetic NFC Loyalty System API",
            "version": "1.0.0",
            "endpoints": {
                "docs": "API documentation",
                "health": "/health",
                "auth": "/api/auth/login, /api/auth/register"
            }
        }), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
