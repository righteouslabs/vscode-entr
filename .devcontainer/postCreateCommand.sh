#!/bin/bash

# Stop on error
set -e

# Print all commands
set -x

# Start necessary services
sudo service dbus start
Xvfb :99 &
export DISPLAY=:99

# Install Yeoman
yarn global add "yo" "generator-code" "@vscode/vsce" "ovsx"

# Install dependencies
yarn install

# Show final command
echo "Script 'postCreateCommand.sh' ran successfully!"
