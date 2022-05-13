#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "Please provide a semantic version argument like x.y.z"
    exit 1
fi
TAG=$1
declare -a CONFIG_ARRAY
mapfile -t CONFIG_ARRAY < <(find config -iname '*.json')
CONFIG_ARRAY+=("package.json")

for CONFIG_PATH in "${CONFIG_ARRAY[@]}"; do
    sed -i -E "s/(@solid\/community-server\/)\^[0-9]+\.[0-9]+\.[0-9]+/\1\^${TAG}/gm" "$CONFIG_PATH"
done