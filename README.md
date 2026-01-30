# Frontier GoWild Flight Scanner

A personal flight scanner for finding Frontier GoWild availability. Scans Frontier's website using your logged-in session to find GoWild-eligible flights.

## Features

- **Outbound Search**: Search specific origin-destination pairs
- **Anywhere Mode**: Find the cheapest GoWild flights to any destination
- **SQLite Caching**: Results cached for 45 minutes to reduce scan time
- **Rate Limiting**: Built-in rate limiting to avoid overloading Frontier's servers

## Requirements

- Node.js 20+
- pnpm
- Docker (for deployment)

## Local Development

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium

# Start development server
pnpm dev

# Open http://localhost:3000
```

## Deployment to VPS (Linux)

### Prerequisites

1. Install Docker and Docker Compose on your VPS:

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

2. Open port 3000 (or configure a reverse proxy)

### Deployment Steps

1. **Copy the project to your VPS**:

```bash
# Option A: Git clone (if you've pushed to a repo)
git clone <your-repo-url> frontier-scanner
cd frontier-scanner

# Option B: SCP from your local machine
scp -r ~/projects/frontier-scanner user@your-vps:/home/user/
```

2. **Build and start the app**:

```bash
cd frontier-scanner
docker compose build
docker compose up -d
```

3. **Check logs**:

```bash
docker compose logs -f app
```

4. **Access the app**:

Open `http://your-vps-ip:3000` in your browser.

### Initial Login (One-Time Setup)

The first time you use the scanner, you need to log in to Frontier manually. This requires a GUI since Frontier's login uses various anti-bot measures.

**Option A: Use X11 forwarding (requires X server on your local machine)**

```bash
# Connect with X11 forwarding
ssh -X user@your-vps

# Start the app with display support
cd frontier-scanner
DISPLAY=:0 docker compose --profile login up app-login

# Access http://your-vps-ip:3001/settings and click "Login to Frontier"
```

**Option B: Use VNC (install desktop environment on VPS)**

1. Install a lightweight desktop and VNC server on your VPS
2. Connect via VNC
3. Open a browser to `http://localhost:3000/settings`
4. Click "Login to Frontier" and complete the login

**Option C: Run login locally, copy cookies**

1. Run the app locally: `pnpm dev`
2. Go to `http://localhost:3000/settings` and login
3. Copy `data/cookies.json` to your VPS: `scp data/cookies.json user@vps:~/frontier-scanner/data/`

After login, your session cookies are saved and the scanner can run headlessly.

### Using a Reverse Proxy (Optional)

If you want to use a domain name with HTTPS:

**With Caddy:**

```bash
# Install Caddy
sudo apt install caddy

# Edit /etc/caddy/Caddyfile
scanner.yourdomain.com {
    reverse_proxy localhost:3000
}

# Restart Caddy
sudo systemctl restart caddy
```

## Usage

### Settings Page (`/settings`)

- Login to Frontier (one-time setup)
- View session status
- Logout when needed

### Outbound Search (`/outbound`)

1. Select one or more origin airports
2. Select one or more destination airports
3. Choose a date
4. Click "Scan Flights"
5. View results including GoWild availability

### Anywhere Mode (`/anywhere`)

1. Select your origin airport
2. Choose a date
3. Set how many destinations to scan (more = slower)
4. Click "Find GoWild Flights"
5. Results sorted by lowest taxes/fees

## GoWild Notes

- GoWild seats typically open the **day before departure** for domestic flights
- International flights may have different availability windows
- Availability is limited and first-come, first-served
- Results are cached for 45 minutes to balance freshness vs. server load

## Troubleshooting

### "Not logged in" error

Your session cookies have expired. Go to `/settings` and login again.

### No flights found

- Check that you're searching for a valid Frontier route
- Try a different date
- Frontier may not operate that route

### Scan is slow

- Each destination requires a separate browser session
- Results are cached, so subsequent scans will be faster
- Reduce "Max Destinations" in Anywhere mode

### Docker build fails

Make sure you have at least 4GB RAM available for the build. You can add swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API endpoints
│   │   ├── airports/      # Get airport list
│   │   ├── auth-status/   # Check login status
│   │   ├── cache-test/    # Cache testing
│   │   ├── login/         # Login flow
│   │   ├── scan/          # Flight scanning
│   │   └── validate-session/
│   ├── anywhere/          # Anywhere mode UI
│   ├── outbound/          # Outbound search UI
│   └── settings/          # Settings page
└── lib/                   # Shared modules
    ├── airports.ts        # Frontier airport list
    ├── cache.ts           # SQLite cache
    ├── cached-scanner.ts  # Scanner with caching
    ├── playwright.ts      # Browser automation
    └── scanner.ts         # Flight scraping logic

data/                      # Persistent data (gitignored)
├── app.db                 # SQLite cache database
└── cookies.json           # Frontier session cookies
```

## License

For personal use only. Not affiliated with Frontier Airlines.
