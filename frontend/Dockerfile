FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy app code
COPY . .

EXPOSE 5173

# Run dev server (for production, use npm run build + serve)
CMD ["npm", "run", "dev", "--", "--host"]
