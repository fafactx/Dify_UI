FROM node:16-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend ./
COPY frontend ./public

EXPOSE 3000

CMD ["node", "server.js"]
