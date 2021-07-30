FROM node:16
RUN mkdir -p /app/node_modules && chown -R node:node /app
WORKDIR /app
COPY package.json yarn.lock ./
# dependencies
RUN apt-get -y update && apt-get install -y \
    fortune-mod \
    fortunes \
    && rm -rf /var/lib/apt/lists/* 
# `fortune` is located at /usr/games/fortune by default.
ENV PATH="/usr/games/:${PATH}"
USER node
RUN yarn
COPY --chown=node:node . .
RUN yarn build
CMD [ "node", "dist/index.js" ]
