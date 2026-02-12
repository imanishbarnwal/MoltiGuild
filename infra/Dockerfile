FROM node:22-slim

# Minimal deps: git for pnpm, curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm (OpenClaw uses pnpm workspaces)
RUN npm install -g pnpm@10.23.0

# Install Cloudflare Tunnel (single binary, ~50MB)
RUN curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

WORKDIR /app

# Copy MoltiGuild configs (agents, skills, openclaw config)
COPY agents/ ./agents/
COPY skills/ ./skills/
COPY openclaw.config.json ./

# Copy entrypoint
COPY infra/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# openclaw-repo is mounted as a volume at runtime
# node_modules is cached in a separate volume

EXPOSE 18789

ENTRYPOINT ["./entrypoint.sh"]
