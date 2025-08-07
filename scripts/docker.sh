#!/bin/bash

# Docker management scripts for Volcanion Auth

set -e

COMPOSE_FILE="docker-compose.yml"
DEV_COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_usage() {
    echo "Usage: $0 {dev|prod|build|stop|clean|logs|status|setup}"
    echo ""
    echo "Commands:"
    echo "  dev     - Start development environment"
    echo "  prod    - Start production environment"
    echo "  build   - Build production image"
    echo "  stop    - Stop all services"
    echo "  clean   - Remove all containers and volumes"
    echo "  logs    - Show logs"
    echo "  status  - Show status of services"
    echo "  setup   - Setup production environment"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
}

setup_production() {
    print_info "Setting up production environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.production.example" ]; then
            cp .env.production.example $ENV_FILE
            print_warning "Created $ENV_FILE from example. Please edit it with your values."
        else
            print_error ".env.production.example not found"
            exit 1
        fi
    fi
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate if not exists
    if [ ! -f "nginx/ssl/cert.pem" ]; then
        print_info "Generating self-signed SSL certificate..."
        openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_warning "Generated self-signed certificate. Replace with real certificate in production."
    fi
    
    # Create directories
    mkdir -p logs uploads
    
    print_success "Production environment setup complete"
}

start_dev() {
    print_info "Starting development environment..."
    docker-compose -f $DEV_COMPOSE_FILE up -d
    print_success "Development environment started"
    print_info "API available at: http://localhost:3000"
    print_info "Health check: http://localhost:3000/api/v1/health"
}

start_prod() {
    print_info "Starting production environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "$ENV_FILE not found. Run '$0 setup' first."
        exit 1
    fi
    
    docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE up -d
    print_success "Production environment started"
    print_info "API available at: https://localhost"
    print_info "Health check: https://localhost/health"
}

build_prod() {
    print_info "Building production image..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    print_success "Production image built successfully"
}

stop_services() {
    print_info "Stopping all services..."
    docker-compose -f $DEV_COMPOSE_FILE down 2>/dev/null || true
    docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
    print_success "All services stopped"
}

clean_all() {
    print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up..."
        docker-compose -f $DEV_COMPOSE_FILE down -v --rmi all 2>/dev/null || true
        docker-compose -f $COMPOSE_FILE down -v --rmi all 2>/dev/null || true
        docker system prune -f
        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

show_logs() {
    if docker-compose -f $DEV_COMPOSE_FILE ps -q app 2>/dev/null | grep -q .; then
        print_info "Showing development logs..."
        docker-compose -f $DEV_COMPOSE_FILE logs -f app
    elif docker-compose -f $COMPOSE_FILE ps -q app 2>/dev/null | grep -q .; then
        print_info "Showing production logs..."
        docker-compose -f $COMPOSE_FILE logs -f app
    else
        print_error "No running services found"
    fi
}

show_status() {
    print_info "Service Status:"
    echo ""
    echo "Development:"
    docker-compose -f $DEV_COMPOSE_FILE ps 2>/dev/null || echo "Not running"
    echo ""
    echo "Production:"
    docker-compose -f $COMPOSE_FILE ps 2>/dev/null || echo "Not running"
}

# Main script
check_docker

case ${1} in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    build)
        build_prod
        ;;
    stop)
        stop_services
        ;;
    clean)
        clean_all
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    setup)
        setup_production
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
