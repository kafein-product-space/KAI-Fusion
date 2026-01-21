# 1. Bağımlılıkların kurulumu (prod ve dev)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2. Uygulama dosyaları ve build
FROM node:22-alpine AS build
WORKDIR /app

# ✅ Build-time env değişkenleri tanımlanıyor
ARG VITE_API_BASE_URL
ARG VITE_API_VERSION
ARG VITE_NODE_ENV
ARG VITE_ENABLE_LOGGING

# ✅ Build ortamına geçiriliyor
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_VERSION=$VITE_API_VERSION
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_ENABLE_LOGGING=$VITE_ENABLE_LOGGING

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# ✅ Build sırasında env'ler gömülmüş olacak
RUN npm run build

# 3. Prod sunucu (react-router-serve ile SSR)
FROM node:22-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build

# Copy entrypoint script for runtime config generation
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
