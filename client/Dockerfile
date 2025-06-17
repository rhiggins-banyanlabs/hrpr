# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /app

# Install dependencies (npm ci is preferred for CI)
COPY package.json package-lock.json ./
RUN npm ci

# Everything else will be mounted in dev, so skip copying source files

# Expose Next.js port
EXPOSE 3000

# Default dev command (Turbopack or Vite users might adjust this)
CMD ["npm", "run", "dev"]
