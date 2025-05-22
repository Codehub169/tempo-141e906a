#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Personal Budget Tracker Setup ---"

# Navigate to the script's directory to ensure relative paths work correctly
cd "$(dirname "$0")"

echo "STEP 1: Installing Node.js dependencies..."
if npm install; then
    echo "SUCCESS: Dependencies installed."
else
    echo "ERROR: Failed to install dependencies. Please check npm logs."
    exit 1
fi

echo "STEP 2: Ensuring database directory exists..."
# The database file will be created inside the 'db' directory by the application
if mkdir -p ./db; then
    echo "SUCCESS: Database directory './db' ensured."
else
    echo "ERROR: Failed to create database directory './db'."
    exit 1
fi

echo "STEP 3: Starting the application on port 9000..."
# The server.js is configured to run on port 9000.
# The 'npm start' script is defined in package.json as 'node server.js'.
if npm start; then
    echo "Application started successfully. Access it at http://localhost:9000"
else
    echo "ERROR: Failed to start the application. Check server logs."
    exit 1
fi

echo "--- Setup Complete. Application should be running. ---"