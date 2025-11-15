# Installing TriviaForge on CasaOS

## Method 1: Import Docker Compose File (Recommended)

1. **Download the CasaOS compose file**
   - Download `docker-compose.casaos.yml` from this repository

2. **Open CasaOS Web UI**
   - Navigate to your CasaOS dashboard (usually `http://your-casaos-ip`)

3. **Import Custom App**
   - Click on "App Store" in the sidebar
   - Click the "Import" button (usually in the top right)
   - Upload the `docker-compose.casaos.yml` file
   - Or paste the contents of the file into the import dialog

4. **Configure Environment Variables**
   - Set `ADMIN_PASSWORD` to a secure password (required!)
   - Optionally set `HOST_IP` to your CasaOS server's IP address
   - Optionally set `SERVER_URL` if you're using a domain/reverse proxy

5. **Install the App**
   - Click "Install" or "Submit"
   - Wait for CasaOS to pull the image and start the container

6. **Access TriviaForge**
   - Click on the TriviaForge app in your CasaOS dashboard
   - Or navigate to: `http://your-casaos-ip:3000/landing.html`

## Method 2: Manual Docker Compose

If the import method doesn't work, you can install manually:

1. **SSH into your CasaOS server**

2. **Create a directory for TriviaForge**
   ```bash
   mkdir -p /DATA/AppData/triviaforge
   cd /DATA/AppData/triviaforge
   ```

3. **Create docker-compose.yml**
   ```bash
   nano docker-compose.yml
   ```

4. **Paste the following configuration:**
   ```yaml
   services:
     app:
       image: emancodetemplar/triviaforge:latest
       container_name: triviaforge
       ports:
         - "3000:3000"
       environment:
         APP_PORT: 3000
         ADMIN_PASSWORD: your_secure_password_here  # CHANGE THIS!
         HOST_IP: 192.168.x.x  # Your CasaOS IP
       volumes:
         - ./quizzes:/app/quizzes
         - ./sessions:/app/sessions
       restart: unless-stopped
   ```

5. **Update the configuration**
   - Change `ADMIN_PASSWORD` to a secure password
   - Update `HOST_IP` to your CasaOS server's IP address
   - Save and exit (Ctrl+X, Y, Enter)

6. **Start TriviaForge**
   ```bash
   docker-compose up -d
   ```

7. **Access TriviaForge**
   - Navigate to: `http://your-casaos-ip:3000/landing.html`

## Method 3: CasaOS CLI

Using the CasaOS CLI (if available):

```bash
casaos-cli app-management install docker://emancodetemplar/triviaforge:latest
```

## Post-Installation

### First-Time Setup

1. Navigate to `http://your-casaos-ip:3000/landing.html`
2. Enter your admin password (the one you set in ADMIN_PASSWORD)
3. You'll see three options:
   - **Admin Panel**: Create and manage quizzes
   - **Presenter**: Host live trivia games
   - **Display Screen**: Large screen view for audiences

### Accessing from Mobile Devices

Players can join games by navigating to:
```
http://your-casaos-ip:3000/player.html
```

### Using a Domain Name

If you're using a reverse proxy (like Nginx Proxy Manager in CasaOS):

1. Set up a reverse proxy pointing to `triviaforge:3000`
2. Update the `SERVER_URL` environment variable:
   ```yaml
   SERVER_URL: https://trivia.yourdomain.com
   ```
3. Restart the container

## Data Persistence

Your data is stored in Docker volumes:
- **Quizzes**: `/app/quizzes` - Your custom quiz files
- **Sessions**: `/app/sessions` - Game session data

To backup your data from CasaOS:
```bash
docker cp triviaforge:/app/quizzes ./backup-quizzes
docker cp triviaforge:/app/sessions ./backup-sessions
```

## Updating TriviaForge

To update to the latest version:

1. **Via CasaOS UI**:
   - Open the TriviaForge app settings
   - Click "Update" if available

2. **Via CLI**:
   ```bash
   docker pull emancodetemplar/triviaforge:latest
   docker-compose down
   docker-compose up -d
   ```

## Troubleshooting

### Can't Access the App

- Check that port 3000 is not being used by another app
- Verify the container is running: `docker ps | grep triviaforge`
- Check logs: `docker logs triviaforge`

### QR Codes Not Working

- Make sure `HOST_IP` is set to your CasaOS server's IP address
- Or use `SERVER_URL` if you have a domain name

### Forgot Admin Password

Restart the container with a new password:
```bash
docker-compose down
# Edit docker-compose.yml and change ADMIN_PASSWORD
docker-compose up -d
```

## Support

- GitHub Issues: https://github.com/EmanTemplar/TriviaForge/issues
- Documentation: https://github.com/EmanTemplar/TriviaForge

---

**TriviaForge** - Where Knowledge Meets Fun 🎮
