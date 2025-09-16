#!/bin/bash
# Extract FHIR client ID and secret from Docker volume

echo "Extracting FHIR client credentials..."

CLIENT_ID=$(docker run --rm -v form-auto-population_fhir_operator_secrets:/secrets alpine grep "^FHIR_CLIENT_ID=" /secrets/form-auto-population-service.env | cut -d'=' -f2)
CLIENT_SECRET=$(docker run --rm -v form-auto-population_fhir_operator_secrets:/secrets alpine grep "^FHIR_CLIENT_SECRET=" /secrets/form-auto-population-service.env | cut -d'=' -f2)

if [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
    echo "✅ Successfully extracted credentials:"
    echo "FHIR_CLIENT_ID=$CLIENT_ID"
    echo "FHIR_CLIENT_SECRET=$CLIENT_SECRET"
else
    echo "❌ Failed to extract credentials"
    exit 1
fi