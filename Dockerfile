FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev

ENV CATEQUESIS_DB_PATH=/var/lib/catequesis/catequesis.sqlite
ENV CATEQUESIS_HOST=127.0.0.1
ENV CATEQUESIS_PORT=3000

CMD ["npm", "start"]
