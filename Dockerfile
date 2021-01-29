FROM node:14.10.0-alpine

WORKDIR /user/src/community-solid-server

# Install app dependencies (extra layer for caching reasons)
COPY package*.json ./
RUN npm install

COPY . .

ENTRYPOINT ["npm", "run", "start", "--"]

CMD [""]
