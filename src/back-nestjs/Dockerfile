FROM node:19

ARG PORT

EXPOSE $PORT

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g nodemon

CMD ["nodemon", "-L", "--watch", "src", "--exec", "ts-node", "src/main.ts"]
