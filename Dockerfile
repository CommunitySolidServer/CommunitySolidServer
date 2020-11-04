FROM node:14.10.0-alpine

ENV NODE_VERSION 14.10.0

# Setting the log level
ARG LEVEL=info
ENV LEVEL ${LEVEL}

# Setting the port on which the server will run
ARG PORT=3000
ENV PORT ${PORT}

# Create application directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Copy source files, install dependencies and build
COPY . /usr/app/
RUN npm ci --unsafe-perm

# Expose port and set command
EXPOSE ${PORT}
CMD node ./bin/server.js -l ${LEVEL} -p ${PORT}
