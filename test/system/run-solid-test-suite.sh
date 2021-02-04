#!/bin/bash
set -e

# Start server
npm start &
PID=$!

# Initialize tests
pushd test/tmp
rm -rf solid-crud-tests
git clone https://github.com/solid/solid-crud-tests
cd solid-crud-tests
git checkout v2.0.3
npm ci

# Run tests
export SERVER_ROOT=http://localhost:3000
export ALICE_WEBID_DOC=$SERVER_ROOT/profile.ttl
export ALICE_WEBID=$ALICE_WEBID#me
curl -X PUT $ALICE_WEBID_DOC -d '<#me> <http://www.w3.org/ns/pim/space#storage> </>.'
npm run jest

# Clean up
kill $PID
popd
