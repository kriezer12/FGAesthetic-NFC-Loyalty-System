# ================================
# FG Aesthetic NFC Loyalty System
# Backend Dockerfile
# ================================
#
# Build: docker build -t fgaesthetic-backend .
# Run:   docker run -p 5000:5000 fgaesthetic-backend

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=180s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run the Flask application
CMD ["python", "-m", "app.main"]
