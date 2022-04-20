#!/usr/bin/env bash
# Script to validate the packaged module

TEST_NAME="Deployment testing"
mkdir logs

echo "$TEST_NAME - Building and installing package"
npm pack --loglevel warn
npm install -g solid-community-server-*.tgz --loglevel warn
rm solid-community-server-*.tgz

# Change key/cert paths of example-https-file.json
sed -i -E "s/(\W+\"options_key\".*\").+(\".*)/\1server.key\2/" config/example-https-file.json
sed -i -E "s/(\W+\"options_cert\".*\").+(\".*)/\1server.cert\2/" config/example-https-file.json

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

  mkdir -p .data

  CSS_ARGS="-p 8888 -l warn -f .data/ -s http://localhost:4000/sparql"
  CSS_BASE_URL="http://localhost:8888"

  # HTTPS config needs a base-url override + keys and certs
  if [[ $CONFIG_NAME =~ "https-file-cli" ]]; then
    CSS_ARGS="$CSS_ARGS --httpsKey server.key --httpsCert server.cert"
  fi
  if [[ $CONFIG_NAME =~ "https" ]]; then
    CSS_BASE_URL="https://localhost:8888"
  fi

  echo -e "----------------------------------"
  echo "$TEST_NAME($CONFIG_NAME) - Starting the server"
  community-solid-server $CSS_ARGS -b $CSS_BASE_URL -c $CONFIG_PATH  &>logs/$CONFIG_NAME &
  PID=$!

  FAILURE=1
  if [ -z $PID ]; then
    echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Server did not start"
    cat logs/$CONFIG_NAME
  else
    echo "$TEST_NAME($CONFIG_NAME) - Attempting HTTP access to the server"
    if curl -sfkI -X GET --retry 15 --retry-connrefused --retry-delay 1 $CSS_BASE_URL > logs/$CONFIG_NAME-curl; then
      echo "$TEST_NAME($CONFIG_NAME) - SUCCESS: server reached"
      FAILURE=0
    fi
    if [ $FAILURE -eq 1 ]; then
      echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Could not reach server"
    fi
    kill -9 $PID &> /dev/null
    timeout 30s tail --pid=$PID -f /dev/null
  fi

  rm -rf .data/*

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
    echo "$TEST_NAME($CONFIG_NAME) - CSS logs: ";
    cat logs/$CONFIG_NAME
    echo "$TEST_NAME($CONFIG_NAME) - curl logs: ";
    cat logs/$CONFIG_NAME-curl.log
    VALIDATION_FAILURE=1
    FAILURES="$FAILURES[FAILURE]\t$CONFIG_NAME\t($CONFIG_PATH)\n"
  fi
  echo ""
done;

echo "$TEST_NAME - Cleanup"
npm uninstall -g @solid/community-server

echo -e "\n\n----------------------------------------"
echo "Config validation overview"
echo "----------------------------------------"
echo -e $SUCCESSES
echo -e $FAILURES
exit $VALIDATION_FAILURE
