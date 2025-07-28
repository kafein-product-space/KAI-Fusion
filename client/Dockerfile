# 1. Bağımlılıkların kurulumu (prod ve dev)
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# 2. Uygulama dosyaları ve build
FROM node:22-alpine AS build
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# 3. Prod sunucu (react-router-serve ile SSR)
FROM node:22-alpine AS production
WORKDIR /app

# Yalnızca prod bağımlılıkları kuruluyor
COPY package*.json ./
RUN npm ci --omit=dev

# Build edilmiş uygulama kopyalanıyor
COPY --from=build /app/build ./build

# react-router-serve CLI globalde çalıştırılmak isteniyorsa (opsiyonel)
# RUN npm install -g @react-router/serve

# Port dışa açılıyor
EXPOSE 3000

# SSR server başlatılıyor
CMD ["npm", "run", "start"]
