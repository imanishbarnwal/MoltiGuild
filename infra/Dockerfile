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

WORKDIR /app

# Copy application files (respects .dockerignore)
COPY . .

# Install script dependencies
RUN cd /app/scripts && npm install --production

# Expose ports
# 18789 - OpenClaw Gateway
# 11434 - Ollama API
# 3001  - Coordinator API
EXPOSE 18789 11434 3001

# Set entrypoint
RUN chmod +x /app/infra/entrypoint.sh
ENTRYPOINT ["/app/infra/entrypoint.sh"]
