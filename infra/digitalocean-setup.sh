#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MoltiGuild — DigitalOcean Droplet Setup (OpenClaw Gateway)
# ═══════════════════════════════════════════════════════════════
#
# Provisions the cheapest DO Droplet ($6/mo: 1GB RAM, 1vCPU, 25GB SSD)
# and deploys the OpenClaw gateway container with Cloudflare tunnel.
#
# Prerequisites:
#   - doctl CLI installed: https://docs.digitalocean.com/reference/doctl/how-to/install/
#   - Authenticated: doctl auth init
#   - SSH key added to DO: doctl compute ssh-key list
#
# Usage:
#   chmod +x infra/digitalocean-setup.sh
#   ./infra/digitalocean-setup.sh
#
# After setup, SSH into the droplet and run the deploy script:
#   ssh root@<DROPLET_IP> 'bash /root/deploy-openclaw.sh'
#
# Cost: $6/month (s-1vcpu-1gb) — covered by DO student credits
# ═══════════════════════════════════════════════════════════════

set -e

# ── CONFIG ─────────────────────────────────────────────────────
DROPLET_NAME="moltiguild-openclaw"
REGION="nyc1"           # Cheapest US region
SIZE="s-1vcpu-1gb"      # $6/mo — 1 vCPU, 1GB RAM, 25GB SSD
IMAGE="docker-20-04"    # Ubuntu 20.04 with Docker pre-installed
SSH_KEY_NAME=""          # Set this or pass as $1

# Allow SSH key name from arg
if [ -n "$1" ]; then
    SSH_KEY_NAME="$1"
fi

# ── VALIDATE ───────────────────────────────────────────────────
if ! command -v doctl &>/dev/null; then
    echo "ERROR: doctl not installed. Install from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    echo "  Windows: scoop install doctl"
    echo "  Mac:     brew install doctl"
    echo "  Linux:   snap install doctl"
    exit 1
fi

echo "═══════════════════════════════════════"
echo "  MoltiGuild — DigitalOcean Setup"
echo "═══════════════════════════════════════"

# ── GET SSH KEY ────────────────────────────────────────────────
echo ""
echo "[1/4] Finding SSH key..."

if [ -z "$SSH_KEY_NAME" ]; then
    echo "Available SSH keys:"
    doctl compute ssh-key list --format ID,Name,FingerPrint
    echo ""
    read -p "Enter SSH key ID (or 'skip' to create without SSH): " SSH_KEY_ID
else
    SSH_KEY_ID=$(doctl compute ssh-key list --format ID,Name --no-header | grep "$SSH_KEY_NAME" | awk '{print $1}')
fi

# ── CREATE DROPLET ─────────────────────────────────────────────
echo ""
echo "[2/4] Creating Droplet: $DROPLET_NAME ($SIZE in $REGION)..."

CREATE_CMD="doctl compute droplet create $DROPLET_NAME \
    --region $REGION \
    --size $SIZE \
    --image $IMAGE \
    --tag-names moltiguild,openclaw \
    --wait"

if [ -n "$SSH_KEY_ID" ] && [ "$SSH_KEY_ID" != "skip" ]; then
    CREATE_CMD="$CREATE_CMD --ssh-keys $SSH_KEY_ID"
fi

eval $CREATE_CMD

# ── GET DROPLET IP ─────────────────────────────────────────────
echo ""
echo "[3/4] Getting Droplet IP..."
sleep 5

DROPLET_IP=$(doctl compute droplet get $DROPLET_NAME --format PublicIPv4 --no-header)
echo "Droplet IP: $DROPLET_IP"

# ── GENERATE DEPLOY SCRIPT ────────────────────────────────────
echo ""
echo "[4/4] Generating deploy script..."

cat > /tmp/deploy-openclaw.sh << 'DEPLOY_EOF'
#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MoltiGuild OpenClaw — Droplet Deploy Script
# Run this ON the Droplet after provisioning.
# ═══════════════════════════════════════════════════════════════
set -e

echo "═══════════════════════════════════════"
echo "  Deploying OpenClaw Gateway"
echo "═══════════════════════════════════════"

# ── CLONE REPOS ────────────────────────────────────────────────
cd /root

if [ ! -d "MoltiGuild" ]; then
    echo "[1] Cloning MoltiGuild..."
    git clone https://github.com/imanishbarnwal/MoltiGuild.git
fi

if [ ! -d "MoltiGuild/openclaw-repo" ]; then
    echo "[2] Cloning OpenClaw repo..."
    cd MoltiGuild
    git clone https://github.com/nicholasgriffintn/openclaw.git openclaw-repo
    cd /root
fi

# ── ENV FILE ───────────────────────────────────────────────────
cd /root/MoltiGuild

if [ ! -f ".env" ]; then
    echo "[3] Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit /root/MoltiGuild/.env with your secrets:"
    echo "  - CF_TUNNEL_TOKEN (Cloudflare tunnel)"
    echo "  - OPENCLAW_GATEWAY_TOKEN"
    echo "  - Any API keys needed"
    echo ""
    echo "Run: nano /root/MoltiGuild/.env"
fi

# ── SWAP FILE (1GB RAM is tight) ──────────────────────────────
if [ ! -f /swapfile ]; then
    echo "[4] Creating 1GB swap file (helps with 1GB RAM)..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap enabled: $(swapon --show)"
fi

# ── FIREWALL ───────────────────────────────────────────────────
echo "[5] Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 18789/tcp # OpenClaw Gateway
ufw --force enable

# ── BUILD & START ──────────────────────────────────────────────
echo "[6] Building and starting OpenClaw container..."
cd /root/MoltiGuild
docker compose -f infra/docker-compose.yml --profile full up -d openclaw

echo ""
echo "═══════════════════════════════════════"
echo "  OpenClaw Gateway deployed!"
echo "  URL: http://$(curl -s ifconfig.me):18789"
echo "═══════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  docker logs -f moltiguild-openclaw    # View logs"
echo "  docker restart moltiguild-openclaw    # Restart"
echo "  docker compose -f infra/docker-compose.yml --profile full down  # Stop"
echo ""
DEPLOY_EOF

# ── UPLOAD DEPLOY SCRIPT ──────────────────────────────────────
echo "Uploading deploy script to Droplet..."
scp -o StrictHostKeyChecking=no /tmp/deploy-openclaw.sh root@$DROPLET_IP:/root/deploy-openclaw.sh

echo ""
echo "═══════════════════════════════════════"
echo "  Droplet Ready!"
echo "═══════════════════════════════════════"
echo ""
echo "  IP:   $DROPLET_IP"
echo "  Cost: \$6/month (s-1vcpu-1gb)"
echo ""
echo "  Next steps:"
echo "    1. SSH in:  ssh root@$DROPLET_IP"
echo "    2. Edit .env:  nano /root/MoltiGuild/.env"
echo "    3. Deploy:  bash /root/deploy-openclaw.sh"
echo ""
echo "  The script creates a 1GB swap file to handle"
echo "  the pnpm install on 1GB RAM droplets."
echo ""
