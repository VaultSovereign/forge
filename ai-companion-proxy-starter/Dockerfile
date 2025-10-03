FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm i --omit=dev || npm i --omit=dev
COPY src /app/src
ENV NODE_ENV=production
CMD ["node","src/server.js"]

