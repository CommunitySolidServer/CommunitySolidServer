#!/usr/bin/env bash
docker pull tenforce/virtuoso
docker container create --name css-virtuoso \
  -p 4000:8890 \
  -e SPARQL_UPDATE=true \
  tenforce/virtuoso
