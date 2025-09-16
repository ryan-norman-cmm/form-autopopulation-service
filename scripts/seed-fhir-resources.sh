#!/bin/bash
# FHIR Resource Seeding Script
# Creates OAuth2 clients, access policies, and Kafka subscriptions in Aidbox

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AIDBOX_URL="http://localhost:8081"
CLIENT_ID="form-auto-population-service"

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}❌ .env file not found! Run ./scripts/init.sh first${NC}"
    exit 1
fi

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

# Wait for Aidbox to be ready
wait_for_aidbox() {
    log_info "Waiting for Aidbox FHIR server to be ready..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$AIDBOX_URL/health" > /dev/null 2>&1; then
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

# Create OAuth2 Client
create_oauth_client() {
    log_info "Creating OAuth2 client: $CLIENT_ID"
    
    local client_json=$(cat <<EOF
{
  "resourceType": "Client",
  "id": "$CLIENT_ID",
  "secret": "$FORM_AUTOPOPULATION_CLIENT_SECRET",
  "grant_types": ["client_credentials"],
  "scope": ["system/Patient.read", "system/Questionnaire.*", "system/QuestionnaireResponse.*"]
}
EOF
)
    
    local response=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "root:$AIDBOX_CLIENT_SECRET" | base64)" \
        -d "$client_json" \
        "$AIDBOX_URL/Client/$CLIENT_ID")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "OAuth2 client created successfully"
    else
        log_error "Failed to create OAuth2 client (HTTP $http_code)"
        echo "${response%???}"
        return 1
    fi
}

# Create Access Policy for Questionnaires
create_questionnaire_policy() {
    log_info "Creating access policy for Questionnaire resources"
    
    local policy_json=$(cat <<EOF
{
  "resourceType": "AccessPolicy",
  "id": "questionnaire-access-policy",
  "uri": "urn:policy:questionnaire-access",
  "description": "Allow form-auto-population-service to access Questionnaire resources",
  "type": "sql",
  "sql": {
    "query": "SELECT true WHERE \$client.id = '$CLIENT_ID'"
  },
  "resource": {
    "type": "Questionnaire"
  },
  "action": ["read", "create", "update", "delete"]
}
EOF
)
    
    local response=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "root:$AIDBOX_CLIENT_SECRET" | base64)" \
        -d "$policy_json" \
        "$AIDBOX_URL/AccessPolicy/questionnaire-access-policy")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "Questionnaire access policy created"
    else
        log_error "Failed to create Questionnaire access policy (HTTP $http_code)"
        echo "${response%???}"
        return 1
    fi
}

# Create Access Policy for QuestionnaireResponses
create_questionnaireresponse_policy() {
    log_info "Creating access policy for QuestionnaireResponse resources"
    
    local policy_json=$(cat <<EOF
{
  "resourceType": "AccessPolicy",
  "id": "questionnaireresponse-access-policy",
  "uri": "urn:policy:questionnaireresponse-access",
  "description": "Allow form-auto-population-service to access QuestionnaireResponse resources",
  "type": "sql",
  "sql": {
    "query": "SELECT true WHERE \$client.id = '$CLIENT_ID'"
  },
  "resource": {
    "type": "QuestionnaireResponse"
  },
  "action": ["read", "create", "update", "delete"]
}
EOF
)
    
    local response=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "root:$AIDBOX_CLIENT_SECRET" | base64)" \
        -d "$policy_json" \
        "$AIDBOX_URL/AccessPolicy/questionnaireresponse-access-policy")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "QuestionnaireResponse access policy created"
    else
        log_error "Failed to create QuestionnaireResponse access policy (HTTP $http_code)"
        echo "${response%???}"
        return 1
    fi
}

# Create Kafka Subscription for Patient updates
create_patient_subscription() {
    log_info "Creating Kafka subscription for Patient updates"
    
    local subscription_json=$(cat <<EOF
{
  "resourceType": "AidboxSubscription",
  "id": "patient-updates-kafka",
  "status": "active",
  "trigger": {
    "Patient": {
      "event": ["create", "update"]
    }
  },
  "channel": {
    "type": "aidbox-kafka",
    "endpoint": "kafka:9092",
    "payload": "application/fhir+json",
    "headers": {
      "Content-Type": "application/fhir+json"
    },
    "config": {
      "topic": "form.population.requested",
      "bootstrap.servers": "kafka:9092",
      "acks": "all",
      "retries": "3"
    }
  }
}
EOF
)
    
    local response=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "root:$AIDBOX_CLIENT_SECRET" | base64)" \
        -d "$subscription_json" \
        "$AIDBOX_URL/AidboxSubscription/patient-updates-kafka")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "Patient Kafka subscription created"
    else
        log_error "Failed to create Patient Kafka subscription (HTTP $http_code)"
        echo "${response%???}"
        return 1
    fi
}

# Create Kafka Subscription for QuestionnaireResponse updates
create_questionnaireresponse_subscription() {
    log_info "Creating Kafka subscription for QuestionnaireResponse updates"
    
    local subscription_json=$(cat <<EOF
{
  "resourceType": "AidboxSubscription",
  "id": "questionnaireresponse-updates-kafka",
  "status": "active",
  "trigger": {
    "QuestionnaireResponse": {
      "event": ["create", "update"]
    }
  },
  "channel": {
    "type": "aidbox-kafka",
    "endpoint": "kafka:9092",
    "payload": "application/fhir+json",
    "headers": {
      "Content-Type": "application/fhir+json"
    },
    "config": {
      "topic": "form.population.completed",
      "bootstrap.servers": "kafka:9092",
      "acks": "all",
      "retries": "3"
    }
  }
}
EOF
)
    
    local response=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "root:$AIDBOX_CLIENT_SECRET" | base64)" \
        -d "$subscription_json" \
        "$AIDBOX_URL/AidboxSubscription/questionnaireresponse-updates-kafka")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "QuestionnaireResponse Kafka subscription created"
    else
        log_error "Failed to create QuestionnaireResponse Kafka subscription (HTTP $http_code)"
        echo "${response%???}"
        return 1
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "FHIR Resource Seeding"
    echo "========================================"
    
    # Wait for Aidbox to be ready
    wait_for_aidbox
    
    # Create OAuth2 client
    create_oauth_client
    
    # Create access policies
    create_questionnaire_policy
    create_questionnaireresponse_policy
    
    # Create Kafka subscriptions
    create_patient_subscription
    create_questionnaireresponse_subscription
    
    log_success "FHIR resource seeding completed!"
    log_info ""
    log_info "Created resources:"
    log_info "✓ OAuth2 Client: $CLIENT_ID"
    log_info "✓ Access policies for Questionnaire and QuestionnaireResponse"
    log_info "✓ Kafka subscriptions for Patient and QuestionnaireResponse events"
    log_info ""
    log_info "You can now start the form auto-population service:"
    log_info "npx nx serve form-auto-population-service"
}

# Run main function
main "$@"