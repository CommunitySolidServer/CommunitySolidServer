#!/usr/bin/env bash

# Start server
npm start &
PID=$!

# Initialize tests
pushd test/tmp
git clone https://github.com/solid/solid-crud-tests
cd solid-crud-tests
git checkout v0.3.0
npm ci

# Run tests
export SERVER_ROOT=http://localhost:3000
export ALICE_WEBID_DOC=$SERVER_ROOT/profile.ttl
export ALICE_WEBID=$ALICE_WEBID#me
curl -X PUT $ALICE_WEBID_DOC -d '<#me> <http://www.w3.org/ns/pim/space#storage> </>.'
npm run jest
RESULT=$?

# Clean up
kill $PID
popd
exit $RESULT
