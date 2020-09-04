#!/usr/bin/env bash
# Script to validate our packed package

npm pack
tar -xzf solid-community-server-*.tgz
pushd package

# Check if our server can start at a given port
node bin/server.js -p 8888 &
pid=$!
i=0
EXITCODE=0
until curl -s localhost:8888; do
  sleep 1

  # Try for at most 10 seconds, assume failure otherwise
  let i++
  if [ $i -gt 10 ]; then
    echo "Server start timeout"
    echo "  Server may have failed to start, or is running at an unexpected port."
    kill -9 $pid
    EXITCODE=1
    break;
  fi
done > /dev/null
kill -9 $pid

popd
rm -r package
rm solid-community-server-*.tgz
exit $EXITCODE
