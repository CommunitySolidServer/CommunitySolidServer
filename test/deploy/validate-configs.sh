#!/usr/bin/env bash
# Script to validate the packaged module

TEST_NAME="Deployment testing"

echo "$TEST_NAME - Building and installing package"
npm pack --loglevel warn
npm install -g solid-community-server-*.tgz --loglevel warn
rm solid-community-server-*.tgz

run_server () {
  if [ -z $1 ]; then
    echo "Config argument not set"
    return 1
  elif [ ! -f $1 ]; then
    echo "Config file does not exist, check the path."
    return 1
  fi
  echo "$TEST_NAME($1) - Starting the server"
  community-solid-server -p 8888 -l warn -c $1 &
  PID=$!

  FAILURE=1
  if [ -z $PID ]; then
    echo "$TEST_NAME($1) - Failure: Server did not start"
  else
    echo "$TEST_NAME($1) - Attempting HTTP access to the server"
    for i in {1..10}; do
      sleep 1
      if curl -s -f localhost:8888 > /dev/null; then
        echo "$TEST_NAME($1) - Success: server reached"
        FAILURE=0
        break
      fi
    done
    if [ $FAILURE -eq 1 ]; then
      echo "$TEST_NAME($1) - Failure: Could not reach server"
    fi
    kill -9 $PID
  fi

  return $FAILURE
}

# echo "$TEST_NAME - Cleanup"
# npm uninstall -g @solid/community-server

FAILURE=0;
FAILURE_LIST=''
for config in config/*.json; do
  run_server $config
  SERVER_FAILURE=$?
  echo $SERVER_FAILURE
  if [ $SERVER_FAILURE -eq 0 ]; then
    echo "$config succeeded";
  else
    echo "$config failed";
    FAILURE=1
    FAILURE_LIST="$FAILURE_LIST$config\n"
  fi
done;

echo -e $FAILURE_LIST
exit $FAILURE