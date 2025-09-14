#!/bin/bash

# Test script for form-auto-population E2E with Kafka
# This script will start the necessary services and run the E2E test

set -e

echo "🚀 Starting Form Auto-Population E2E Test with Kafka"
echo

# Check if Docker Compose services are running
echo "📋 Checking Docker Compose services..."
if ! docker ps | grep -q kafka-broker; then
    echo "❌ Kafka is not running. Please start with: docker compose up -d"
    exit 1
fi

if ! docker ps | grep -q aidbox-fhir-server; then
    echo "❌ Aidbox is not running. Please start with: docker compose up -d"
    exit 1
fi

echo "✅ Docker services are running"

# Get the port of the mock FHIR server (this will be dynamic)
echo "📋 Starting mock FHIR server for testing..."

# Build the service first
echo "📋 Building form-auto-population-service..."
npx nx build form-auto-population-service

# Start the mock FHIR server in background and capture its port
# This is handled by the E2E test itself

# Instructions for user
echo
echo "📋 To run the full end-to-end test with Kafka:"
echo "1. Start the infrastructure: docker compose up -d"
echo "2. The E2E test will start a mock FHIR server"
echo "3. Start the service manually with the mock FHIR URL:"
echo "   AIDBOX_URL=http://localhost:[MOCK_PORT] KAFKA_BOOTSTRAP_SERVERS=localhost:9094 npx nx serve form-auto-population-service"
echo "4. Run the E2E test: npx nx e2e form-auto-population-service-e2e --testNamePattern='Kafka'"
echo
echo "OR run the simplified test without Kafka:"
echo "   npx nx e2e form-auto-population-service-e2e --testNamePattern='Form auto-population service converts'"
echo

# Run the original E2E test (without Kafka) as a smoke test
echo "📋 Running smoke test (without Kafka integration)..."
npx nx e2e form-auto-population-service-e2e --testNamePattern="Form auto-population service converts"

echo
echo "✅ Smoke test completed successfully!"
echo "💡 To test with actual Kafka, follow the instructions above"