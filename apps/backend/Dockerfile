FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=development

# Use variáveis configuráveis para evitar segredos hardcoded
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movemarias
ARG REDIS_URL=redis://redis:6379
ARG JWT_SECRET=change-me
ARG COOKIE_SECRET=change-me-cookie
ARG JWT_EXPIRES_IN=7d
ARG CORS_ORIGIN=http://localhost:8080

ENV DATABASE_URL=${DATABASE_URL}
ENV REDIS_URL=${REDIS_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV COOKIE_SECRET=${COOKIE_SECRET}
ENV JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
ENV CORS_ORIGIN=${CORS_ORIGIN}

CMD ["npm", "run", "dev"]
