#!/bin/bash
# Form Auto-Population Service Initialization Script
# Generates secure environment variables and seeds FHIR resources

set -e  # Exit on any error

# Default values
CLEAN_DOCKER=false
AIDBOX_LICENSE=""
AUTOMATE=false
SKIP_BROWSER=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_DOCKER=true
            shift
            ;;
        --license)
            AIDBOX_LICENSE="$2"
            shift 2
            ;;
        --automate)
            AUTOMATE=true
            SKIP_BROWSER=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --clean      Clean all Docker images, volumes, and containers before setup"
            echo "  --license    Provide Aidbox license key (skips interactive prompt)"
            echo "  --automate   Fully automated setup with no user prompts"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

# Clean Docker state completely
clean_docker_state() {
    log_info "Cleaning Docker state completely..."
    
    # Stop and remove all containers
    if docker ps -q | grep -q .; then
        log_info "Stopping running containers..."
        docker stop $(docker ps -q) || true
    fi
    
    # Remove containers, networks, and volumes with explicit volume removal
    log_info "Removing containers, networks, and volumes..."
    docker compose down --remove-orphans --volumes 2>/dev/null || true
    
    # Explicitly remove any remaining project volumes
    log_info "Removing any remaining project volumes..."
    if docker volume ls -q | grep -q "form-auto-population"; then
        docker volume rm $(docker volume ls -q | grep "form-auto-population") 2>/dev/null || true
    fi
    
    # Clean system: containers, networks, images, volumes
    log_info "Performing complete Docker cleanup..."
    docker system prune -af --volumes || true
    
    log_success "Docker state cleaned successfully"
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

# Open URL in default browser (cross-platform)
open_browser() {
    local url="$1"
    if command -v open &> /dev/null; then
        # macOS
        open "$url"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "$url"
    elif command -v start &> /dev/null; then
        # Windows (Git Bash/WSL)
        start "$url"
    else
        log_warning "Could not automatically open browser. Please manually visit:"
        echo "  $url"
        return 1
    fi
}

# Get Aidbox license from user
get_aidbox_license() {
    # If license provided via command line, use it
    if [ -n "$AIDBOX_LICENSE" ]; then
        echo "$AIDBOX_LICENSE"
        return 0
    fi
    
    # If in automated mode and no license provided, error
    if [ "$AUTOMATE" = true ]; then
        log_error "Automated mode requires --license parameter" >&2
        log_error "Usage: $0 --automate --license 'your-license-key'" >&2
        exit 1
    fi
    
    log_info "Aidbox FHIR server requires a development license (free, 100-year validity)" >&2
    echo "" >&2
    echo "📋 License acquisition steps:" >&2
    echo "   1. Sign up at Aidbox portal" >&2
    echo "   2. Verify your email and complete profile setup" >&2
    echo "   3. Navigate to: Licenses → New license → Dev → Self-Hosted → Create" >&2
    echo "   4. Copy the generated license key" >&2
    echo "" >&2

    # Ask if user wants to open browser (skip if automated)
    if [ "$SKIP_BROWSER" = false ]; then
        echo -n "Would you like to open the Aidbox signup page in your browser? [Y/n]: " >&2
        read -r open_browser_choice
        
        # Default to Y if empty
        if [ -z "$open_browser_choice" ] || [[ "$open_browser_choice" =~ ^[Yy]$ ]]; then
            log_info "Opening Aidbox signup page..." >&2
            if open_browser "https://aidbox.app/ui/portal#/signup" >&2; then
                log_success "Browser opened successfully" >&2
            else
                log_warning "Please manually visit: https://aidbox.app/ui/portal#/signup" >&2
            fi
        else
            log_info "Please manually visit: https://aidbox.app/ui/portal#/signup" >&2
        fi
    else
        log_info "Please manually visit: https://aidbox.app/ui/portal#/signup" >&2
    fi

    echo "" >&2
    log_info "After creating your account and license, you'll be redirected to create a new license." >&2
    log_info "Choose the following options:" >&2
    echo "   - License type: Dev" >&2
    echo "   - Goal: Development" >&2
    echo "   - Hosting: Self-hosted" >&2
    echo "   - FHIR version: 4.0.1 (recommended)" >&2
    echo "" >&2

    # Wait for user to get license
    local license_key=""
    while [ -z "$license_key" ]; do
        echo -n "Please enter your Aidbox development license key: " >&2
        read -r license_key

        if [ -z "$license_key" ]; then
            log_error "License key cannot be empty. Please try again." >&2
        elif [ ${#license_key} -lt 10 ]; then
            log_error "License key seems too short. Please check and try again." >&2
            license_key=""
        fi
    done

    # Only output the license key to stdout (this is what gets captured by the variable assignment)
    echo "$license_key"
}

# Generate .env file from .env.example
generate_env_file() {
    log_info "Generating .env file with secure credentials..."

    if [ ! -f ".env.example" ]; then
        log_error ".env.example file not found!"
        exit 1
    fi

    # Get Aidbox license from user
    log_info "Step 1: Obtaining Aidbox development license..."
    local aidbox_license=$(get_aidbox_license)

    log_info "Step 2: Generating secure passwords..."
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

    # Handle license key replacement safely (handles multi-line content)
    # Use a more robust approach with temporary files
    local temp_env=$(mktemp)
    local license_file=$(mktemp)
    
    # Write license to temporary file
    echo "$aidbox_license" > "$license_file"
    
    # Process .env line by line, replacing the placeholder
    while IFS= read -r line; do
        if [[ "$line" == *"your_aidbox_dev_license_key_here"* ]]; then
            # Replace the placeholder with the actual license key
            echo "AIDBOX_LICENSE_KEY=$aidbox_license"
        else
            echo "$line"
        fi
    done < .env > "$temp_env"
    
    # Replace the original file
    mv "$temp_env" .env
    
    # Clean up temporary files
    rm -f "$license_file"

    # Clean up backup file
    rm -f .env.bak

    # Store the generated client secret for later use
    export FORM_AUTOPOPULATION_CLIENT_SECRET="$form_autopopulation_client_secret"
    export AIDBOX_CLIENT_SECRET="$aidbox_client_secret"
    export AIDBOX_ADMIN_PASSWORD="$aidbox_admin_password"
    export AIDBOX_LICENSE_KEY="$aidbox_license"

    log_success ".env file generated with secure credentials and Aidbox license"
    log_info "Generated credentials:"
    echo "  - POSTGRES_PASSWORD: $postgres_password"
    echo "  - AIDBOX_ADMIN_PASSWORD: $aidbox_admin_password"
    echo "  - AIDBOX_CLIENT_SECRET: $aidbox_client_secret"
    echo "  - FORM_AUTOPOPULATION_CLIENT_SECRET: $form_autopopulation_client_secret"
    echo "  - AIDBOX_LICENSE_KEY: ${aidbox_license:0:20}... (truncated for security)"
}


# Generate Aidbox init bundle
generate_init_bundle() {
    log_info "Step 3: Generating Aidbox init bundle..."

    if ! ./scripts/generate-init-bundle.sh; then
        log_error "Failed to generate Aidbox init bundle"
        return 1
    fi

    log_success "Aidbox init bundle generated!"
    echo ""
    log_info "The bundle will automatically seed:"
    echo "  ✓ OAuth2 Client: form-auto-population-service"
    echo "  ✓ Access policies for Questionnaire and QuestionnaireResponse"
    echo "  ✓ Kafka subscriptions for auto-population events"
}

# Main execution
main() {
    echo "=========================================="
    echo "🏥 Form Auto-Population Service Setup"
    echo "=========================================="
    echo "This script will set up your complete FHIR-based form auto-population environment."
    echo ""

    # Check dependencies
    check_dependencies
    
    # Clean Docker state if requested
    if [ "$CLEAN_DOCKER" = true ]; then
        clean_docker_state
        echo ""
    fi
    
    # Remove any existing .env file
    if [ -f ".env" ]; then
        log_info "Removing existing .env file..."
        rm -f .env
        log_success "Existing .env file removed"
        echo ""
    fi

    # Generate environment file (includes license acquisition)
    generate_env_file

    # If automated mode, skip user choice
    if [ "$AUTOMATE" = true ]; then
        log_info "Running in automated mode..."
        automated_setup
        return 0
    fi

    echo ""
    log_info "🚀 Complete setup options:"
    echo ""
    log_info "💡 Tip: Press Enter to accept defaults (Y for browser, 1 for automated setup)"
    echo ""
    echo "Option 1: Full automated setup (recommended) [default]"
    echo "   This will start infrastructure and seed all FHIR resources automatically"
    echo ""
    echo "Option 2: Manual step-by-step setup"
    echo "   You'll run infrastructure and seeding commands manually"
    echo ""

    while true; do
        echo -n "Choose setup option (1 for automated, 2 for manual) [1]: "
        read -r choice
        
        # Default to 1 if empty
        if [ -z "$choice" ]; then
            choice="1"
        fi

        case $choice in
            1)
                log_info "Starting automated setup..."
                automated_setup
                break
                ;;
            2)
                manual_setup_instructions
                break
                ;;
            *)
                log_error "Please enter 1 or 2"
                ;;
        esac
    done
}

# Automated setup option
automated_setup() {
    echo ""

    # Generate init bundle first
    generate_init_bundle

    echo ""
    log_info "🔄 Starting Docker infrastructure with automatic FHIR seeding..."
    if ! docker compose up -d; then
        log_error "Failed to start Docker infrastructure"
        echo ""
        log_info "Please check Docker is running and try manual setup:"
        manual_setup_instructions
        return 1
    fi

    echo ""
    log_success "🎉 Complete setup finished!"
    echo ""
    log_info "Your FHIR healthcare application is now fully configured and running!"
    echo ""
    log_info "📊 Access URLs:"
    echo "   • Aidbox FHIR Server: http://localhost:8081"
    echo "   • Kafka UI (Kafdrop): http://localhost:19001"
    echo ""
    log_info "🚀 Start your service:"
    echo "   npx nx serve form-auto-population-service"
    echo ""
    log_info "   Your service will be available at: http://localhost:3000"
    echo ""
    log_info "💡 All FHIR resources were automatically seeded using Aidbox's native init bundle!"
    echo ""
    log_warning "🔒 Keep your .env file secure - it contains generated passwords and license key!"
}

# Manual setup instructions
manual_setup_instructions() {
    echo ""

    # Generate init bundle for manual setup too
    generate_init_bundle

    echo ""
    log_success "Environment setup complete!"
    echo ""
    log_info "🚀 Ready to start your FHIR healthcare application!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Start infrastructure: docker compose up -d"
    log_info "2. Start service: npx nx serve form-auto-population-service"
    echo ""
    log_info "📊 Access URLs (after starting services):"
    echo "   • Aidbox FHIR Server: http://localhost:8081"
    echo "   • Kafka UI (Kafdrop): http://localhost:19001"
    echo "   • Form Auto-Population Service: http://localhost:3000"
    echo ""
    log_info "💡 FHIR resources will be automatically seeded when Aidbox starts!"
    echo ""
    log_warning "🔒 Keep your .env file secure - it contains generated passwords and license key!"
}

# Run main function
main "$@"
