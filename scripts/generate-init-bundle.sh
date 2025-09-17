#!/bin/bash
# Generate Aidbox init bundle with environment-specific values

set -e

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found! Run ./scripts/init.sh first"
    exit 1
fi

# Replace placeholders with actual values and generate the final bundle
sed -e "s/{{FORM_AUTOPOPULATION_CLIENT_SECRET}}/$FORM_AUTOPOPULATION_CLIENT_SECRET/g" \
    -e "s/{{FORM_POPULATION_COMPLETED_TOPIC}}/$FORM_POPULATION_COMPLETED_TOPIC/g" \
    -e "s/{{KAFKA_INTERNAL_HOST}}/$KAFKA_INTERNAL_HOST/g" \
    -e "s/{{KAFKA_INTERNAL_PORT}}/$KAFKA_INTERNAL_PORT/g" \
    config/aidbox-init-bundle.json > /tmp/aidbox-init-bundle.json

echo "✅ Generated Aidbox init bundle at /tmp/aidbox-init-bundle.json"