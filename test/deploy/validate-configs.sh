#!/usr/bin/env bash
# Script to validate the packaged module

TEST_NAME="Deployment testing"
mkdir logs

echo "$TEST_NAME - Building and installing package"
npm pack --loglevel warn
npm install -g solid-community-server-*.tgz --loglevel warn
rm solid-community-server-*.tgz

run_server_with_config () {
  if [[ $# -ne 2 ]]; then
    echo "Config arguments not set"
    return 1
  elif [ ! -f $1 ]; then
    echo "Config file does not exist, check the path."
    return 1
  fi
  CONFIG_PATH=$1
  CONFIG_NAME=$2
  echo -e "----------------------------------"
  echo "$TEST_NAME($CONFIG_NAME) - Starting the server"
  community-solid-server -p 8888 -l warn -s "http://localhost:4000/sparql" -c $CONFIG_PATH &>logs/$CONFIG_NAME &
  PID=$!

  FAILURE=1
  if [ -z $PID ]; then
    echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Server did not start"
    cat logs/$CONFIG_NAME
  else
    echo "$TEST_NAME($CONFIG_NAME) - Attempting HTTP access to the server"
    for i in {1..30}; do
      echo "$TEST_NAME($CONFIG_NAME) - Attempting HTTP access to the server ($i/30s)"
      sleep 1
      # echo -ne "."
      if curl -s -f localhost:8888 > /dev/null; then
        echo "$TEST_NAME($CONFIG_NAME) - SUCCESS: server reached (after ~${i}s)"
        FAILURE=0
        break
      fi
      if curl -s -f https://localhost:8888 > /dev/null; then
        echo "$TEST_NAME($CONFIG_NAME) - SUCCESS: server reached over https (after ~${i}s)"
        FAILURE=0
        break
      fi
    done
    if [ $FAILURE -eq 1 ]; then
      echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Could not reach server"
    fi
    kill -9 $PID &> /dev/null
    timeout 30s tail --pid=$PID -f /dev/null
  fi

  return $FAILURE
}

VALIDATION_FAILURE=0
SUCCESSES=''
FAILURES=''
STATE=''
for CONFIG_PATH in config/*.json; do
  CONFIG_NAME=$(echo $CONFIG_PATH | sed -E 's/.+\/(.+)\.json/\1/')
  run_server_with_config $CONFIG_PATH $CONFIG_NAME
  SERVER_FAILURE=$?
  if [ $SERVER_FAILURE -eq 0 ]; then
    SUCCESSES="$SUCCESSES[SUCCESS]\t$CONFIG_NAME\t($CONFIG_PATH)\n"
  else
    echo "$TEST_NAME($CONFIG_NAME) - Logs: ";
    cat logs/$CONFIG_NAME
    VALIDATION_FAILURE=1
    FAILURES="$FAILURES[FAILURE]\t$CONFIG_NAME\t($CONFIG_PATH)\n"
  fi
  echo ""
done;

echo -e "\n\n----------------------------------------"
echo "Config validation overview"
echo "----------------------------------------"
echo -e $SUCCESSES
echo -e $FAILURES
exit $VALIDATION_FAILURE