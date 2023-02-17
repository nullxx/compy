FROM node:18-slim as build

WORKDIR /app
COPY . .
RUN npm i
RUN npm run build

FROM node:18-slim

ARG PORT
ENV PORT $PORT

WORKDIR /app

COPY --from=build /app/build build
COPY resources/server-wrapper server-wrapper

EXPOSE $PORT
RUN npm i --production --prefix server-wrapper

CMD [ "node", "server-wrapper/server.js" ]
