#!/bin/bash

# ==============================================
# KAFKA SUBSCRIPTION SETUP SCRIPT
# ==============================================
# This script sets up Kafka-based subscriptions for QuestionnaireResponse events
# Called by init.sh after Aidbox startup

set -euo pipefail

# Source environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
AIDBOX_URL="${AIDBOX_URL:-http://localhost:8081}"
AIDBOX_CLIENT_ID="${AIDBOX_CLIENT_ID:-root}"
AIDBOX_CLIENT_SECRET="${AIDBOX_CLIENT_SECRET:-fBaj5A3CIsCNJsxkwZRH9qofDz1ae4iv}"
KAFKA_TOPIC="${FORM_POPULATION_COMPLETED_TOPIC:-form.population.completed}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Wait for Aidbox to be ready
wait_for_aidbox() {
    log_info "Waiting for Aidbox to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$AIDBOX_URL/health" > /dev/null 2>&1; then
            log_success "Aidbox is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Aidbox not ready yet, waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Aidbox failed to become ready after $max_attempts attempts"
    return 1
}

# Create AidboxSubscriptionTopic
create_subscription_topic() {
    log_info "Creating AidboxSubscriptionTopic for QuestionnaireResponse events..."
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$AIDBOX_URL/AidboxSubscriptionTopic" \
        -u "$AIDBOX_CLIENT_ID:$AIDBOX_CLIENT_SECRET" \
        -H "Content-Type: application/json" \
        -d '{
            "resourceType": "AidboxSubscriptionTopic",
            "id": "questionnaire-response-topic",
            "url": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
            "status": "active",
            "trigger": [
                {
                    "resource": "QuestionnaireResponse",
                    "fhirPathCriteria": "status = '\''completed'\'' or status = '\''amended'\''"
                }
            ]
        }')
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "AidboxSubscriptionTopic created successfully"
        return 0
    else
        log_error "Failed to create AidboxSubscriptionTopic. HTTP Code: $http_code"
        echo "$body"
        return 1
    fi
}

# Create AidboxTopicDestination for Kafka
create_kafka_destination() {
    log_info "Creating AidboxTopicDestination for Kafka delivery..."
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$AIDBOX_URL/AidboxTopicDestination" \
        -u "$AIDBOX_CLIENT_ID:$AIDBOX_CLIENT_SECRET" \
        -H "Content-Type: application/json" \
        -d '{
            "resourceType": "AidboxTopicDestination",
            "meta": {
                "profile": [
                    "http://aidbox.app/StructureDefinition/aidboxtopicdestination-kafka-best-effort"
                ]
            },
            "kind": "kafka-best-effort",
            "id": "kafka-destination",
            "topic": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
            "parameter": [
                {
                    "name": "kafkaTopic",
                    "valueString": "'"$KAFKA_TOPIC"'"
                },
                {
                    "name": "bootstrapServers",
                    "valueString": "kafka:9092"
                }
            ]
        }')
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "AidboxTopicDestination created successfully"
        log_success "Kafka subscription configured to publish to topic: $KAFKA_TOPIC"
        return 0
    else
        log_error "Failed to create AidboxTopicDestination. HTTP Code: $http_code"
        echo "$body"
        return 1
    fi
}

# Verify subscription setup
verify_subscription() {
    log_info "Verifying subscription configuration..."
    
    # Check subscription topic
    local topic_response=$(curl -s -u "$AIDBOX_CLIENT_ID:$AIDBOX_CLIENT_SECRET" \
        "$AIDBOX_URL/AidboxSubscriptionTopic/questionnaire-response-topic")
    
    if echo "$topic_response" | grep -q '"status":"active"'; then
        log_success "AidboxSubscriptionTopic is active"
    else
        log_warning "AidboxSubscriptionTopic may not be properly configured"
    fi
    
    # Check kafka destination
    local dest_response=$(curl -s -u "$AIDBOX_CLIENT_ID:$AIDBOX_CLIENT_SECRET" \
        "$AIDBOX_URL/AidboxTopicDestination/kafka-destination")
    
    if echo "$dest_response" | grep -q '"kind":"kafka-best-effort"'; then
        log_success "AidboxTopicDestination is configured for Kafka"
    else
        log_warning "AidboxTopicDestination may not be properly configured"
    fi
}

# Main execution
main() {
    log_info "Starting Kafka subscription setup..."
    
    # Wait for Aidbox to be ready
    if ! wait_for_aidbox; then
        log_error "Cannot proceed without Aidbox being ready"
        exit 1
    fi
    
    # Create subscription topic
    if ! create_subscription_topic; then
        log_error "Failed to create subscription topic"
        exit 1
    fi
    
    # Create Kafka destination
    if ! create_kafka_destination; then
        log_error "Failed to create Kafka destination"
        exit 1
    fi
    
    # Verify setup
    verify_subscription
    
    log_success "Kafka subscription setup completed successfully!"
    log_info "QuestionnaireResponse events with status 'completed' or 'amended' will be published to Kafka topic: $KAFKA_TOPIC"
}

# Run main function
main "$@"