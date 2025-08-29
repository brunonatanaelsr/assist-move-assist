FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=development
ENV DATABASE_URL=postgresql://postgres:15002031@postgres:5432/movemarias
ENV REDIS_URL=redis://redis:6379
ENV JWT_SECRET=your_jwt_secret_key_here
ENV JWT_EXPIRES_IN=7d
ENV CORS_ORIGIN=https://cautious-space-waddle-r4vx96jpv5p93pvp5-8080.app.github.dev

CMD ["npm", "run", "dev"]
