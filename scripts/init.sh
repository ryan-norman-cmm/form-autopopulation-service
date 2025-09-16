#!/bin/bash
# Form Auto-Population Service Initialization Script
# Generates secure environment variables and seeds FHIR resources

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if required tools are available
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v openssl &> /dev/null; then
        missing_deps+=("openssl")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install them and try again."
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Generate .env file from .env.example
generate_env_file() {
    log_info "Generating .env file with secure credentials..."
    
    if [ ! -f ".env.example" ]; then
        log_error ".env.example file not found!"
        exit 1
    fi
    
    # Generate secure passwords
    local postgres_password=$(generate_password)
    local aidbox_admin_password=$(generate_password)
    local aidbox_client_secret=$(generate_password)
    local form_autopopulation_client_secret=$(generate_password)
    
    # Copy .env.example to .env and replace placeholders
    cp .env.example .env
    
    # Replace password placeholders with generated values
    sed -i.bak "s/your_postgres_password_here/$postgres_password/g" .env
    sed -i.bak "s/admin/$aidbox_admin_password/g" .env
    sed -i.bak "s/your_aidbox_client_secret_here/$aidbox_client_secret/g" .env
    sed -i.bak "s/your_form_autopopulation_client_secret_here/$form_autopopulation_client_secret/g" .env
    
    # Clean up backup file
    rm -f .env.bak
    
    # Store the generated client secret for later use
    export FORM_AUTOPOPULATION_CLIENT_SECRET="$form_autopopulation_client_secret"
    export AIDBOX_CLIENT_SECRET="$aidbox_client_secret"
    export AIDBOX_ADMIN_PASSWORD="$aidbox_admin_password"
    
    log_success ".env file generated with secure credentials"
    log_info "Generated credentials:"
    echo "  - POSTGRES_PASSWORD: $postgres_password"
    echo "  - AIDBOX_ADMIN_PASSWORD: $aidbox_admin_password"
    echo "  - AIDBOX_CLIENT_SECRET: $aidbox_client_secret"
    echo "  - FORM_AUTOPOPULATION_CLIENT_SECRET: $form_autopopulation_client_secret"
}

# Wait for Aidbox to be ready
wait_for_aidbox() {
    log_info "Waiting for Aidbox FHIR server to be ready..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:8081/health > /dev/null 2>&1; then
            log_success "Aidbox is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 5
        ((attempt++))
    done
    
    log_error "Aidbox failed to start after $((max_attempts * 5)) seconds"
    return 1
}

# Main execution
main() {
    echo "========================================"
    echo "Form Auto-Population Service Setup"
    echo "========================================"
    
    # Check dependencies
    check_dependencies
    
    # Generate environment file
    generate_env_file
    
    log_info "Environment setup complete!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Start infrastructure: docker compose up -d"
    log_info "2. Run seed script: ./scripts/seed-fhir-resources.sh"
    log_info "3. Start service: npx nx serve form-auto-population-service"
    log_info ""
    log_warning "Keep your .env file secure - it contains generated passwords!"
}

# Run main function
main "$@"