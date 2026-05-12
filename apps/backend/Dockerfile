# Use a Node.js 18 base image
FROM node:18-alpine

# Install dependencies required for native module compilation and Redis
RUN apk add --no-cache openssl python3 make g++ linux-headers eudev-dev vips-dev redis

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with specific platform settings for Sharp
RUN npm ci --omit=optional
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

# Copy the rest of the application code
COPY . .

# Generate Prisma client without running migrations
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Expose the port your NestJS app is running on
EXPOSE 3000

# Start the application, running migrations at runtime
CMD ["/bin/sh", "-c", "redis-server --daemonize yes && npx prisma migrate deploy && node dist/src/main.js"]