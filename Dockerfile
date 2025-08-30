# Use the official Node.js image as the base image.
# This image contains the Node.js runtime and npm, and is optimized for production.
# The 'lts' tag refers to the latest Long-Term Support version of Node.js,
# which is recommended for stability.
FROM node:lts-alpine

ARG SKIP_NPM_INSTALL=false
# Use an argument to conditionally install bash
ARG INSTALL_BASH=false
ARG INSTALL_GIT=false

# Check if bash should be installed
# This is typically done because some base images (like Alpine) don't include it.
RUN if [ "$INSTALL_BASH" = "true" ]; then apk add --no-cache bash; fi
RUN if [ "$INSTALL_GIT" = "true" ]; then apk add --no-cache git; fi

# Set the working directory inside the container.
# This is where your application code will live.
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the working directory.
# We do this first to leverage Docker's build cache. If these files don't
# change, Docker won't re-run the 'npm install' command, which speeds up
# subsequent builds.
COPY package*.json ./

# Install application dependencies.
# The '--production' flag is typically used for deployment to avoid installing
# devDependencies, which are only needed for development.
RUN if [ "$SKIP_NPM_INSTALL" = "false" ]; then npm install --omit=dev; fi

# Copy the rest of the application code into the container.
COPY . .

# Expose the port that your application listens on.
# Change '3000' to the port number your application uses.
EXPOSE 3000

# Define the command to run the application when the container starts.
# We use 'node' with the entry file (e.g., 'server.js' or 'index.js').
# The 'CMD' command should be the primary process of your container.
CMD [ "npm", "start" ]