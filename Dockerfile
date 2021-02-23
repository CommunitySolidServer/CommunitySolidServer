# Build stage
FROM node:lts AS build

## Set current working directory
WORKDIR /community-server

## Copy the package.json for audit
COPY package*.json .

## Verify if there are known vulnerabilities in the dependencies
RUN npm audit --production --audit-level=high

## Copy the dockerfile's context's community server files
COPY . .

## Install and build the Solid community server (prepare script cannot run in wd)
RUN npm ci --ignore-scripts && npm run build



# Runtime stage
FROM node:lts-alpine

## Add contact informations for questions about the container
LABEL maintainer="Solid Community Server Docker Image Maintainer <matthieubosquet@gmail.com>"

## Container config & data dir for volume sharing
## Defaults to filestorage with /data directory (passed through CMD below)
RUN mkdir /config /data

## Set current directory
WORKDIR /community-server

## Copy runtime files from build stage
COPY --from=build /community-server/package.json .
COPY --from=build /community-server/bin ./bin
COPY --from=build /community-server/config ./config
COPY --from=build /community-server/dist ./dist
COPY --from=build /community-server/node_modules ./node_modules
COPY --from=build /community-server/templates ./templates

## Informs Docker that the container listens on the specified network port at runtime
EXPOSE 3000

## Set command run by the container
ENTRYPOINT [ "node", "bin/server.js" ]

## By default run in filemode (overriden if passing alternative arguments)
CMD [ "-c", "config/config-file.json", "-f", "/data" ]
