FROM node:20-slim

WORKDIR /app

# Copy only what the API needs
COPY scripts/package.json ./
RUN npm install --production

COPY scripts/api.js scripts/monad.js scripts/coordinator.js ./

# Data directory for persistent state (heartbeats, pipelines)
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data

EXPOSE 3001

CMD ["node", "api.js"]
