#!/bin/bash

# ================================
# FGAC CORS Diagnostics Script
# ================================
#
# This script helps diagnose CORS and API connectivity issues
# Usage: chmod +x diagnose.sh && ./diagnose.sh

set -e

echo "🔍 Starting FGAC Diagnostics..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ==================== Check .env File ====================
echo -e "${BLUE}=== Environment Variables ===${NC}"

if [ -f ".env" ]; then
    log_success "Found .env file"
    
    if grep -q "SUPABASE_URL" .env; then
        log_success "SUPABASE_URL is set"
    else
        log_error "SUPABASE_URL is missing from .env"
    fi
    
    if grep -q "SUPABASE_KEY" .env; then
        log_success "SUPABASE_KEY is set"
    else
        log_error "SUPABASE_KEY is missing from .env"
    fi
    
    if grep -q "SUPABASE_SERVICE_KEY" .env; then
        log_success "SUPABASE_SERVICE_KEY is set"
    else
        log_error "SUPABASE_SERVICE_KEY is missing from .env"
    fi
else
    log_error ".env file not found in project root"
    log_warning "Create .env file with required variables"
fi

echo ""

# ==================== Check Docker ====================
echo -e "${BLUE}=== Docker Status ===${NC}"

if command -v docker &> /dev/null; then
    log_success "Docker is installed"
    
    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        log_success "Docker daemon is running"
        
        # Check containers
        if docker ps --filter "name=fgaesthetic-backend" --quiet | grep -q .; then
            log_success "Backend container is running"
        else
            log_warning "Backend container is not running"
        fi
        
        if docker ps --filter "name=fgaesthetic-frontend" --quiet | grep -q .; then
            log_success "Frontend container is running"
        else
            log_warning "Frontend container is not running"
        fi
    else
        log_error "Docker daemon is not running"
    fi
else
    log_warning "Docker is not installed - will test local setup instead"
fi

echo ""

# ==================== Check Ports ====================
echo -e "${BLUE}=== Port Availability ===${NC}"

# Check if netstat is available, fallback to lsof
check_port() {
    local port=$1
    local service=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            log_success "Port $port ($service) is in use"
        else
            log_warning "Port $port ($service) is not in use"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            log_success "Port $port ($service) is in use"
        else
            log_warning "Port $port ($service) is not in use"
        fi
    else
        log_info "Unable to check port availability (lsof/netstat not available)"
    fi
}

check_port 5000 "Backend API"
check_port 5173 "Frontend Dev Server"

echo ""

# ==================== Test Connectivity ====================
echo -e "${BLUE}=== Backend Connectivity ===${NC}"

# Test backend health endpoint
if command -v curl &> /dev/null; then
    log_info "Testing backend health endpoint..."
    if curl -s http://localhost:5000/health -m 5 > /dev/null 2>&1; then
        log_success "Backend is responding"
        
        # Check CORS headers
        log_info "Checking CORS headers..."
        CORS_HEADER=$(curl -s -H "Origin: http://localhost:5173" http://localhost:5000/health -m 5 | head -20 | grep -i "access-control")
        if [ -n "$CORS_HEADER" ]; then
            log_success "CORS headers are present"
        else
            log_warning "CORS headers might be missing"
        fi
    else
        log_error "Backend is not responding"
        log_info "Try: docker-compose up --build"
    fi
    
    log_info "Testing frontend..."
    if curl -s http://localhost:5173 -m 5 > /dev/null 2>&1; then
        log_success "Frontend dev server is responding"
    else
        log_error "Frontend dev server is not responding"
        log_info "Try: docker-compose up --build"
    fi
else
    log_warning "curl is not available - skipping connectivity tests"
fi

echo ""

# ==================== Check Log Files ====================
echo -e "${BLUE}=== Recent Log Messages ===${NC}"

if command -v docker &> /dev/null; then
    if docker ps --filter "name=fgaesthetic-backend" --quiet | grep -q .; then
        log_info "Backend container logs (last 5 lines):"
        docker logs --tail 5 fgaesthetic-backend 2>&1 | sed 's/^/  /'
    fi
    
    if docker ps --filter "name=fgaesthetic-frontend" --quiet | grep -q .; then
        log_info "Frontend container logs (last 5 lines):"
        docker logs --tail 5 fgaesthetic-frontend 2>&1 | sed 's/^/  /'
    fi
fi

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
log_info "For detailed debugging instructions, see: DEBUG_CORS_ISSUES.md"
log_info "Common fixes:"
echo "  1. Ensure .env file has all SUPABASE_* variables"
echo "  2. Run: docker-compose down && docker-compose up --build"
echo "  3. Check logs: docker-compose logs -f"
echo "  4. Test backend: curl http://localhost:5000/health"
echo ""
