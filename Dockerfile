FROM node:18.17.0-alpine3.17

# See https://pptr.dev/chromium-support for supported chrome to puppeteer version.
RUN apk add --no-cache \
        chromium=112.0.5615.165-r0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY fonts/*.ttf /usr/share/fonts/
RUN fc-cache -fv

RUN mkdir /home/node/app && chown -R node:node /home/node/app
RUN mkdir /home/node/web && chown -R node:node /home/node/web

COPY --chown=node:node src/web/package*.json /home/node/web/
COPY --chown=node:node src/api/package*.json /home/node/app/

USER node

WORKDIR /home/node/app
RUN npm install && npm cache clean --force --loglevel=error
COPY --chown=node:node src/api/.env* ./

WORKDIR /home/node/web
RUN npm install && npm cache clean --force --loglevel=error

COPY --chown=node:node src/api /home/node/app/
COPY --chown=node:node src/web /home/node/web/

ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build:docker

EXPOSE 3000

WORKDIR /home/node/app

ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ARG IMAGE_TAG=0.0.0
ENV IMAGE_TAG=$IMAGE_TAG

RUN npm run build

COPY --chown=node:node src/api/templates/* /home/node/app/dist/templates/
COPY --chown=node:node src/api/templates/admin/* /home/node/app/dist/templates/admin/
COPY --chown=node:node src/api/templates/admin/vendor/* /home/node/app/dist/templates/admin/vendor/
COPY --chown=node:node src/api/templates/email/* /home/node/app/dist/templates/email/
COPY --chown=node:node src/api/templates/layouts/* /home/node/app/dist/templates/layouts/
COPY --chown=node:node src/api/web/*.png /home/node/app/dist/web/

CMD [ "node", "./dist/index.js" ]
