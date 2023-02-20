FROM node:18-slim as build

WORKDIR /app
COPY . .
RUN npm i
RUN npm run build

FROM nginx:1.21.3-alpine

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
