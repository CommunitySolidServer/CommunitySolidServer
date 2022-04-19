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

  CSS_OPTS="-p 8888 -l warn -s http://localhost:4000/sparql"
  CURL_STATEMENT='http://localhost:8888'
  # HTTPS config needs a base-url override + keys and certs
  if [[ $CONFIG_NAME =~ "https" ]]; then
    sed -i -E "s/(\W+\"options_key\".*\").+(\".*)/\1hostkey.pem\2/" $CONFIG_PATH
    sed -i -E "s/(\W+\"options_cert\".*\").+(\".*)/\1hostcert.pem\2/" $CONFIG_PATH
    CSS_OPTS="$CSS_OPTS -b https://localhost:8888 --httpsKey hostkey.pem --httpsCert hostcert.pem"
    CURL_STATEMENT='-k https://localhost:8888'
  fi

  echo -e "----------------------------------"
  echo "$TEST_NAME($CONFIG_NAME) - Starting the server"
  community-solid-server $CSS_OPTS -c $CONFIG_PATH  &>logs/$CONFIG_NAME &
  PID=$!

  FAILURE=1
  if [ -z $PID ]; then
    echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Server did not start"
    cat logs/$CONFIG_NAME
  else
    echo "$TEST_NAME($CONFIG_NAME) - Attempting HTTP access to the server"
    for i in {1..20}; do
      sleep 1
      if curl -s -f $CURL_STATEMENT > logs/$CONFIG_NAME-curl; then
        echo "$TEST_NAME($CONFIG_NAME) - SUCCESS: server reached (after ~${i}s)"
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
    echo "$TEST_NAME($CONFIG_NAME) - CSS logs: ";
    cat logs/$CONFIG_NAME
    echo "$TEST_NAME($CONFIG_NAME) - curl logs: ";
    cat logs/$CONFIG_NAME-curl.log
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