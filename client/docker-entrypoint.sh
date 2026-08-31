#!/bin/sh
# Generate config.js from environment variables at container startup
# This allows the same Docker image to be used across different environments

CONFIG_PATH="/app/dist/config.js"

# Keep the full API path and its legacy components in sync.
api_version="${VITE_API_VERSION:-/${VITE_API_START:-api}/${VITE_API_VERSION_ONLY:-v1}}"
api_version="/${api_version#/}"
api_version="${api_version%/}"
api_start="${api_version%/*}"
api_start="${api_start#/}"
api_version_only="${api_version##*/}"

echo "Generating runtime config.js from environment variables..."

cat > "$CONFIG_PATH" << EOF
// Runtime configuration - Generated at container startup
// DO NOT EDIT: This file is auto-generated from environment variables

window.VITE_BASE_PATH = "${VITE_BASE_PATH:-/kai}";
window.VITE_API_BASE_URL = "${VITE_API_BASE_URL:-//localhost:8000}";
window.VITE_KEYCLOAK_URL = "${VITE_KEYCLOAK_URL:-}";
window.VITE_KEYCLOAK_CLIENT_ID = "${VITE_KEYCLOAK_CLIENT_ID:-}";
window.VITE_KEYCLOAK_REALM = "${VITE_KEYCLOAK_REALM:-}";
window.VITE_API_START = "${api_start}";
window.VITE_API_VERSION_ONLY = "${api_version_only}";
window.VITE_API_VERSION = "${api_version}";
window.VITE_APP_NAME = "${VITE_APP_NAME:-KAI Flow}";
window.VITE_NODE_ENV = "${VITE_NODE_ENV:-production}";
window.VITE_ENABLE_LOGGING = "${VITE_ENABLE_LOGGING:-false}";
window.VITE_ENTERPRISE = "${VITE_ENTERPRISE:-false}";
EOF

echo "Config written to $CONFIG_PATH"

# Execute the main container command
exec "$@"
