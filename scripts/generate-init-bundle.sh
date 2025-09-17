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

# Replace placeholder with actual secret and generate the final bundle
sed "s/{{FORM_AUTOPOPULATION_CLIENT_SECRET}}/$FORM_AUTOPOPULATION_CLIENT_SECRET/g" \
    config/aidbox-init-bundle.json > /tmp/aidbox-init-bundle.json

echo "✅ Generated Aidbox init bundle at /tmp/aidbox-init-bundle.json"