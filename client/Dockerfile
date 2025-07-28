FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:20-alpine AS production
# Install only production dependencies
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# Copy built application
COPY --from=build-env /app/build /app/build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]