# Use latest node LTS base image
FROM node:lts

# Clone the latest community server & install
RUN git clone https://github.com/solid/community-server.git

WORKDIR /community-server

RUN npm ci

RUN npm run build

# Container config & data dir for volume sharing
# Defaults to filestorage with /data directory (passed through CMD below)
RUN mkdir /config && mkdir /data

# Informs Docker that the container listens on the specified network port at runtime
EXPOSE 3000

# Set command run by the container
ENTRYPOINT [ "node", "/community-server/bin/server.js" ]

# By default run in filemode (overriden if passing alternative arguments)
CMD [ "-c", "config/config-file.json", "-f", "/data" ]
