#!/bin/bash
echo "Checking for existing package.json file..."

# Check if package.json exists.
if [ ! -f "package.json" ]; then
    echo "No package.json found. Creating a new one with defaults."
    npm init -y
fi


echo "Dev container creation complete."
