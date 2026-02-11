FROM node:22-slim

# Install dependencies for Ollama, Tailscale, and Cloudflare
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    zstd \
    ca-certificates \
    git \
    iptables \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Install Cloudflare Tunnel
RUN curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Note: OpenClaw needs to be built from source
# We'll handle this in the entrypoint script

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose ports
# 18789 - OpenClaw Gateway
# 11434 - Ollama API
# 3001  - Coordinator API
EXPOSE 18789 11434 3001

# Copy and set entrypoint
COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
