# MyDrive — Setup Guide

Your personal cloud drive. Upload files from anywhere, download on your phone.

---

## Project Structure

```
mydrive/
├── server.js         ← Node.js backend
├── package.json
├── .env.example      ← Copy to .env and set your token
├── public/
│   └── index.html    ← The web UI
└── uploads/          ← Your files are stored here (created automatically)
```

---

## Local Setup (test on your PC first)

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env

# 3. Edit .env — set a strong secret token
#    Generate one with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Start the server
npm start

# 5. Open http://localhost:3000 in your browser
```

---

## Hosting Options (pick one)

### Option A — Hetzner VPS (~€4/month, recommended)
Best price-to-performance, servers in Europe & USA.

1. Sign up at https://hetzner.com, create a **CX22** server (Ubuntu 24.04)
2. SSH in: `ssh root@YOUR_SERVER_IP`
3. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Upload your project (using `scp` or `git clone`)
5. Install Caddy (handles HTTPS automatically):
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```
6. Create a domain (even a free one at https://duckdns.org) pointing to your server IP
7. Configure Caddy — create `/etc/caddy/Caddyfile`:
   ```
   yourdomain.duckdns.org {
       reverse_proxy localhost:3000
   }
   ```
8. Start everything:
   ```bash
   cd mydrive && npm install && npm start &
   sudo systemctl reload caddy
   ```

### Option B — DigitalOcean Droplet (~$6/month)
Same steps as Hetzner. Use their "Marketplace" > Node.js droplet to skip Node install.

### Option C — Raspberry Pi at Home (free!)
- Install Raspberry Pi OS, install Node.js the same way as above
- Use Caddy + DuckDNS for a free domain
- Make sure your router forwards port 80/443 to the Pi

### Option D — Railway.app (easiest, free tier)
1. Push your project to GitHub
2. Connect at https://railway.app
3. Set `SECRET_TOKEN` in environment variables
4. **Note**: Files won't persist on Railway's free tier — use a paid plan or add a volume

---

## Keeping It Running with PM2

So the server restarts on crash or reboot:

```bash
npm install -g pm2
pm2 start server.js --name mydrive
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

---

## Accessing From Your Phone

1. Visit your domain in any mobile browser (e.g. `https://yourdomain.duckdns.org`)
2. Enter your token → you're in!
3. **Tip**: On iPhone, tap Share → "Add to Home Screen" to install it like an app

---

## Security Notes

- Your `SECRET_TOKEN` is the only thing protecting your files — make it long and random (32+ chars)
- Always use HTTPS (Caddy handles this automatically with Let's Encrypt)
- The `uploads/` folder and `drive.db` are in `.gitignore` — never commit them
- To change your token, update `.env` and restart the server

---

## Managing Storage

Files are stored in the `uploads/` folder on your server. To check disk usage:

```bash
du -sh uploads/
df -h   # overall disk space
```
