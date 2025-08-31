#!/bin/bash
docker build \
  --build-arg KEEP_CERTS=true \
  -f Dockerfile \
  -t cspn-dev-test:latest \
  .

