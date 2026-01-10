#!/bin/bash
set -e

IMAGE_NAME="sandbox-python-rootfs"
CONTAINER_NAME="sandbox-exporter"
OUTPUT_DIR="/opt/sandbox-rootfs"

echo "Building Docker image..."
# Run from project root
docker build -t $IMAGE_NAME -f apps/python-service/sandbox_images/Dockerfile.python .

echo "Creating temporary container..."
# Remove if exists
docker rm -f $CONTAINER_NAME 2>/dev/null || true
docker create --name $CONTAINER_NAME $IMAGE_NAME

echo "Exporting rootfs to $OUTPUT_DIR..."
sudo mkdir -p $OUTPUT_DIR
# Use sudo tar to preserve permissions if needed, but export usually sends tar stream.
# We need to extract as root to preserve ownerships in destination if strict.
# But for sandbox, 9999 user matters.
sudo docker export $CONTAINER_NAME | sudo tar -x -C $OUTPUT_DIR

echo "Cleaning up..."
docker rm $CONTAINER_NAME

echo "RootFS built successfully at $OUTPUT_DIR"
