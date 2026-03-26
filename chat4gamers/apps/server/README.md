git clone <repo>
cd chat4gamers/apps/server
chmod +x setup.sh
./setup.sh

That's it. The script handles everything:

1. Generates a random LiveKit API key/secret and DB encryption key via openssl
2. Detects the server's public IP automatically (prompts to confirm/override)
3. Writes .env with all generated values
4. Generates livekit.yaml from the template (replacing the hardcoded secrets that were previously committed)
5. Runs docker compose up -d --build

Other fixes bundled in:

- Dockerfile now has a yarn build (tsc) step — the old one was missing this, so dist/ never existed and the server would fail to start
- CMD changed to node dist/index.js directly — drops the unnecessary db:push call since the schema self-bootstraps at startup
- livekit.yaml is now gitignored (it contains real secrets); livekit.yaml.template is committed instead
- docker-compose.yml reads everything from .env via env_file — no more hardcoded credentials in the repo
