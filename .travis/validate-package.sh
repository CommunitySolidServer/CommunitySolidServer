#!/usr/bin/env bash
# Script to validate our packed package

echo "Building and installing package"
npm pack
npm install -g solid-community-server-*.tgz
rm solid-community-server-*.tgz

echo "Starting the server"
community-solid-server -p 8888 &
PID=$!

echo "Attempting access over HTTP"
FAILURE=1
if [ -z $PID ]; then
  echo "Server failed to start"
else
  for i in {1..10}; do
    sleep 1
    if curl -s localhost:8888; then
      echo "Server reached"
      FAILURE=0
      break
    fi
  done
  kill -9 $PID
fi

echo "Uninstalling package"
npm uninstall -g @solid/community-server

exit $FAILURE
