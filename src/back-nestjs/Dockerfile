FROM node:19

ARG PORT
ARG PORT_WEBSOCKET

EXPOSE $PORT
EXPOSE $PORT_WEBSOCKET

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g nodemon

CMD ["nodemon", "-L", "--watch", "src", "--exec", "ts-node", "src/main.ts"]
