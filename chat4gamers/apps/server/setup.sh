#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════╗"
echo "║     GeeChat Server Setup         ║"
echo "╚══════════════════════════════════╝"
echo ""

# Check dependencies
for cmd in docker openssl curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌  '$cmd' is required but not installed. Aborting."
    exit 1
  fi
done

if [ -f .env ]; then
  echo "⚠️  .env already exists."
  read -rp "Regenerate all keys and overwrite? [y/N]: " OVERWRITE
  [[ "${OVERWRITE,,}" != "y" ]] && echo "Aborted." && exit 0
  echo ""
fi

# ── Generate secrets ──────────────────────────────────────────────────────────
LIVEKIT_API_KEY="geeserver_$(openssl rand -hex 8)"
LIVEKIT_API_SECRET="$(openssl rand -hex 32)"
DB_KEY="$(openssl rand -hex 32)"

# ── Detect public IP ──────────────────────────────────────────────────────────
echo "Detecting public IP..."
DETECTED_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "")
if [ -z "$DETECTED_IP" ]; then
  echo "  Could not auto-detect. Defaulting to 127.0.0.1"
  DETECTED_IP="127.0.0.1"
else
  echo "  Detected: $DETECTED_IP"
fi

read -rp "Server public IP [$DETECTED_IP]: " INPUT_IP
SERVER_IP="${INPUT_IP:-$DETECTED_IP}"

read -rp "Klipy API key (leave blank to disable GIF support): " KLIPY_API_KEY

# ── Write .env ────────────────────────────────────────────────────────────────
cat > .env <<EOF
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
DB_KEY=${DB_KEY}
SERVER_IP=${SERVER_IP}
NODE_ENV=production
KLIPY_API_KEY=${KLIPY_API_KEY}
EOF
echo "✅ .env written"

# ── Generate livekit.yaml from template ───────────────────────────────────────
sed \
  -e "s|\${LIVEKIT_API_KEY}|${LIVEKIT_API_KEY}|g" \
  -e "s|\${LIVEKIT_API_SECRET}|${LIVEKIT_API_SECRET}|g" \
  -e "s|\${SERVER_IP}|${SERVER_IP}|g" \
  livekit.yaml.template > livekit.yaml
echo "✅ livekit.yaml written"

# ── Start ─────────────────────────────────────────────────────────────────────
echo ""
echo "Building and starting GeeChat server..."
docker compose up -d --build

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  GeeChat is running!                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Chat API  →  http://${SERVER_IP}:4000"
echo "  LiveKit   →  ws://${SERVER_IP}:7880"
echo ""
echo "Point your GeeChat client at:  http://${SERVER_IP}:4000"
echo ""
