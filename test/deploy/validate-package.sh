#!/usr/bin/env bash
# Script to validate the packaged module

TEST_NAME="Deployment test: packaged module"

echo "$TEST_NAME - Building and installing package"
npm pack --loglevel warn
npm install -g solid-community-server-*.tgz --loglevel warn
rm solid-community-server-*.tgz

echo "$TEST_NAME - Starting the server"
community-solid-server -p 8888 -l warn &
PID=$!

FAILURE=1
if [ -z $PID ]; then
  echo "$TEST_NAME - Failure: Server did not start"
else
  echo "$TEST_NAME - Attempting HTTP access to the server"
  for i in {1..10}; do
    sleep 1
    if curl -s -f localhost:8888 > /dev/null; then
      echo "$TEST_NAME - Success: server reached"
      FAILURE=0
      break
    fi
  done
  if [ $FAILURE -eq 1 ]; then
    echo "$TEST_NAME - Failure: Could not reach server"
  fi
  kill -9 $PID
fi

echo "$TEST_NAME - Cleanup"
npm uninstall -g @solid/community-server

exit $FAILURE
