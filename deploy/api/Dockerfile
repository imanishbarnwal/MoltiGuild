FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only what the API needs
COPY scripts/package.json ./
RUN npm install --production

COPY scripts/api.js scripts/monad.js scripts/coordinator.js scripts/guild-matcher.js ./

# Data directory for persistent state (heartbeats, pipelines)
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data

EXPOSE 3001

CMD ["node", "api.js"]
