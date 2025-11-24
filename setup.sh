#!/bin/bash
# TriviaForge Setup Script
# This script prepares the environment for first-time deployment

set -e  # Exit on any error

echo "======================================"
echo "   TriviaForge Setup & Verification   "
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Docker is installed and running
echo "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
print_success "Docker daemon is running"

# Check if docker-compose is available
echo ""
echo "Step 2: Checking docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed or not in PATH"
    echo "Please install docker-compose from: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "docker-compose is installed ($(docker-compose --version))"

# Check for .env file
echo ""
echo "Step 3: Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    echo "Creating .env file from .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created"
        print_warning "IMPORTANT: Edit .env file and set the following required variables:"
        echo "  - ADMIN_PASSWORD (required for admin login)"
        echo "  - SERVER_URL (your server's IP address, e.g., http://192.168.1.100:3000)"
    else
        print_error ".env.example not found - cannot create .env"
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Validate .env has required variables
if grep -q "ADMIN_PASSWORD=$" .env || grep -q "ADMIN_PASSWORD=\s*$" .env; then
    print_warning "ADMIN_PASSWORD is not set in .env file"
    echo "You will need to set this before using the admin panel"
fi

# Pull Docker images
echo ""
echo "Step 4: Pulling required Docker images..."
echo "This may take a few minutes on first run..."
echo ""

print_info "Pulling PostgreSQL 15 image..."
if docker pull postgres:15; then
    print_success "PostgreSQL 15 image downloaded"
else
    print_error "Failed to pull postgres:15 image"
    echo "This could be due to:"
    echo "  - No internet connection"
    echo "  - Docker Hub is down or rate-limited"
    echo "  - Firewall blocking Docker Hub access"
    exit 1
fi

print_info "Pulling TriviaForge application image..."
if docker pull emancodetemplar/triviaforge:latest; then
    print_success "TriviaForge application image downloaded"
else
    print_error "Failed to pull TriviaForge image"
    echo "This could be due to:"
    echo "  - No internet connection"
    echo "  - Docker Hub is down or rate-limited"
    echo "  - Firewall blocking Docker Hub access"
    exit 1
fi

# Check if initialization SQL files exist
echo ""
echo "Step 5: Verifying database initialization files..."
if [ ! -d "app/init" ]; then
    print_error "app/init directory not found"
    exit 1
fi

required_files=("app/init/tables.sql" "app/init/migrate_timestamps.sql" "app/init/update-admin-password.sql")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_success "All initialization files present"

# Check for line ending issues (Windows CRLF vs Unix LF)
echo ""
echo "Step 6: Checking SQL file line endings..."
for file in app/init/*.sql; do
    if file "$file" | grep -q "CRLF"; then
        print_warning "$file has Windows line endings (CRLF)"
        print_info "Converting to Unix line endings (LF)..."

        # Convert CRLF to LF (works on Git Bash, WSL, Mac, Linux)
        if command -v dos2unix &> /dev/null; then
            dos2unix "$file" 2>/dev/null
        else
            # Fallback method
            sed -i 's/\r$//' "$file" 2>/dev/null || true
        fi
    fi
done
print_success "Line endings verified"

# Summary
echo ""
echo "======================================"
echo "   Setup Complete!                    "
echo "======================================"
echo ""
print_success "All prerequisites verified"
print_success "Docker images downloaded"
print_success "Environment configured"
echo ""
echo "Next steps:"
echo "  1. Edit .env file with your configuration (ADMIN_PASSWORD, SERVER_URL)"
echo "  2. Run: docker-compose up -d"
echo "  3. Access the app at: http://localhost:3000"
echo ""
echo "To view logs:    docker-compose logs -f"
echo "To stop:         docker-compose down"
echo "To reset DB:     docker-compose down -v"
echo ""
