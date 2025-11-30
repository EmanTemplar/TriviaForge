FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy app files (excluding node_modules, dist, .env)
COPY . .

# Build Vue 3 frontend with Vite
RUN npm run build

# Expose port
EXPOSE 3000

# Start the Express server (which serves Vue dist/ folder + API endpoints)
CMD ["node", "server.js"]
