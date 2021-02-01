# Runs on the default latest node LTS image
# Build stage
FROM node:lts AS build

## Create the solid community server directory
RUN mkdir /community-server

## Set current working directory
WORKDIR /community-server

## Copy the dockerfile's context's community server files
COPY . .

## Verify if there are known vulnerabilities in the dependencies
RUN npm audit --production --audit-level=high

## Install and build the Solid community server
RUN npm ci


# Runtime stage
FROM node:lts

## Add contact informations for questions about the container
LABEL maintainer="Solid Community Server Docker Image Maintainer <matthieubosquet@gmail.com>"

## Informs Docker that the container listens on the specified network port at runtime
EXPOSE 3000

## Set command run by the container
ENTRYPOINT [ "node", "bin/server.js" ]

## By default run in filemode (overriden if passing alternative arguments)
CMD [ "-c", "config/config-file.json", "-f", "/data" ]

## Container config & data dir for volume sharing
## Defaults to filestorage with /data directory (passed through CMD below)
RUN mkdir /community-server /config /data

## Set current directory
WORKDIR /community-server

## Copy runtime files from build stage
COPY --from=build /community-server/package.json .
COPY --from=build /community-server/bin ./bin
COPY --from=build /community-server/config ./config
COPY --from=build /community-server/dist ./dist
COPY --from=build /community-server/node_modules ./node_modules
COPY --from=build /community-server/templates ./templates
