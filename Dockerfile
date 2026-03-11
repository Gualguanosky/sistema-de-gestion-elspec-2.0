# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite default port
EXPOSE 5173

# Start development server binding to all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
