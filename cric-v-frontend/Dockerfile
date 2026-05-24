# Development frontend — hot reload enabled
FROM node:20-alpine

WORKDIR /app

# Copy package files first (caching optimization)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend code
COPY . .

EXPOSE 3000

# Development command with hot reload
CMD ["npm", "run", "dev"]
