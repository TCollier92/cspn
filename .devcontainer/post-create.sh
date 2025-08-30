#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Print a message to the console
echo "--- Running post-create setup script ---"

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Install the Gemini CLI globally
echo "Installing Gemini CLI..."
npm install -g @google/gemini-cli

echo "--- Post-create setup complete ---"