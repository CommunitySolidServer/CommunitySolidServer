#!/usr/bin/env bash
# Script to validate the packaged module and configs

# Ensure our workdir is that of the project root
cd "${0%/*}/../.." || { echo "Error setting workdir to project directory."; exit 1; }

# This script takes config paths (from project directory) as optional input
# No arguments: all default configs are tested
# One ore more arguments: provided configs are tested
#   Example: validate-configs.sh config/default.json config/file.json
TEST_NAME="Deployment testing"
declare -a CONFIG_ARRAY
if [[ $# -gt 0 ]]; then
    for CONFIG in "$@"; do
      if [ ! -f "$CONFIG" ]; then
        echo "Config file $CONFIG does not exist, check the path (example: config/default.json)"
        exit 1
      fi
      CONFIG_ARRAY+=("$CONFIG")
    done
    echo "Deployment testing ${#CONFIG_ARRAY[@]} configs:"
else
  mapfile -t CONFIG_ARRAY < <(ls config/*.json)
  echo "Deployment testing all configs:"
fi
printf " - %s\n" "${CONFIG_ARRAY[@]}"

mkdir -p test/tmp/data
echo "$TEST_NAME - Building and installing package"
npm pack --loglevel warn
npm install -g solid-community-server-*.tgz --loglevel warn
rm solid-community-server-*.tgz

run_server_with_config () {
  if [[ $# -ne 2 ]]; then
    echo "Config arguments not set"
    return 1
  elif [ ! -f "$1" ]; then
    echo "Config file does not exist, check the path."
    return 1
  fi
  CONFIG_PATH=$1
  CONFIG_NAME=$2

  mkdir -p test/tmp/data

  CSS_ARGS=("-p" "8888" "-l" "warn" "-f" "test/tmp/data/" "-s" "http://localhost:4000/sparql")
  CSS_BASE_URL="http://localhost:8888"

  # HTTPS config specifics: self-signed key/cert + CSS base URL override
  if [[ $CONFIG_NAME =~ "https" ]]; then
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 -keyout test/tmp/server.key -out test/tmp/server.cert -subj '/CN=localhost' &>/dev/null
    CSS_BASE_URL="https://localhost:8888"
    if [[ $CONFIG_NAME =~ "https-file-cli" ]]; then
      CSS_ARGS+=("--httpsKey" "test/tmp/server.key" "--httpsCert" "test/tmp/server.cert")
    elif [[ $CONFIG_NAME =~ "example-https" ]]; then
      CONFIG_PATH=test/tmp/example-https-file.json
      cp config/example-https-file.json $CONFIG_PATH
      sed -i -E "s/(\W+\"options_key\".*\").+(\".*)/\1test\/tmp\/server.key\2/" $CONFIG_PATH
      sed -i -E "s/(\W+\"options_cert\".*\").+(\".*)/\1test\/tmp\/server.cert\2/" $CONFIG_PATH
    fi
  fi

  echo -e "----------------------------------"
  echo "$TEST_NAME($CONFIG_NAME) - Starting the server"
  community-solid-server "${CSS_ARGS[@]}" -b $CSS_BASE_URL -c $CONFIG_PATH &>test/tmp/"$CONFIG_NAME" &
  PID=$!

  FAILURE=1
  if [ -z $PID ]; then
    echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Server did not start"
    cat test/tmp/"$CONFIG_NAME"
  else
    echo "$TEST_NAME($CONFIG_NAME) - Attempting HTTP access to the server"
    if curl -sfkI -X GET --retry 15 --retry-connrefused --retry-delay 5 $CSS_BASE_URL > test/tmp/"$CONFIG_NAME"-curl; then
      echo "$TEST_NAME($CONFIG_NAME) - SUCCESS: server reached"
      FAILURE=0
    else
      echo "$TEST_NAME($CONFIG_NAME) - FAILURE: Could not reach server"
    fi
    kill -9 $PID &> /dev/null
    timeout 30s tail --pid=$PID -f /dev/null
  fi

  rm -rf test/tmp/data/
  return $FAILURE
}

VALIDATION_FAILURE=0
SUCCESSES=''
FAILURES=''
for CONFIG_PATH in "${CONFIG_ARRAY[@]}"; do
  CONFIG_NAME=$(echo "$CONFIG_PATH" | sed -E 's/.+\/(.+)\.json/\1/')

  run_server_with_config "$CONFIG_PATH" "$CONFIG_NAME"
  SERVER_FAILURE=$?
  if [ $SERVER_FAILURE -eq 0 ]; then
    SUCCESSES="${SUCCESSES}[SUCCESS]\t$CONFIG_NAME\t($CONFIG_PATH)\n"
  else
    echo "$TEST_NAME($CONFIG_NAME) - CSS logs: ";
    cat test/tmp/"$CONFIG_NAME"
    echo "$TEST_NAME($CONFIG_NAME) - curl logs: ";
    cat test/tmp/"$CONFIG_NAME"-curl
    VALIDATION_FAILURE=1
    FAILURES="${FAILURES}[FAILURE]\t$CONFIG_NAME\t($CONFIG_PATH)\n"
  fi
  echo ""
done;

echo "$TEST_NAME - Cleanup"
npm uninstall -g @solid/community-server
rm -rf test/tmp/*


echo -e "\n\n----------------------------------------"
echo "Config validation overview"
echo "----------------------------------------"
echo -e "$SUCCESSES"
echo -e "$FAILURES"
exit $VALIDATION_FAILURE
