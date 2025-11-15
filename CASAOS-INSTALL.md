# Installing TriviaForge on CasaOS

## Method 1: Manual Installation via SSH (Recommended)

This is the most reliable method for CasaOS.

1. **SSH into your CasaOS server**

2. **Create a directory for TriviaForge**
   ```bash
   mkdir -p /DATA/AppData/triviaforge
   cd /DATA/AppData/triviaforge
   ```

3. **Pull the Docker image**
   ```bash
   docker pull emancodetemplar/triviaforge:latest
   ```

4. **Create docker-compose.yml**
   ```bash
   nano docker-compose.yml
   ```

5. **Paste the following configuration:**
   ```yaml
   version: "3.9"

   services:
     triviaforge:
       image: emancodetemplar/triviaforge:latest
       container_name: triviaforge
       ports:
         - "3000:3000"
       environment:
         - APP_PORT=3000
         - ADMIN_PASSWORD=your_secure_password_here
         - HOST_IP=192.168.x.x
         - SERVER_URL=
       volumes:
         - triviaforge-quizzes:/app/quizzes
         - triviaforge-sessions:/app/sessions
       restart: unless-stopped

   volumes:
     triviaforge-quizzes:
     triviaforge-sessions:
   ```

6. **Update the configuration**
   - Change `ADMIN_PASSWORD` to a secure password (REQUIRED!)
   - Update `HOST_IP` to your CasaOS server's IP address
   - Save and exit (Ctrl+X, Y, Enter in nano)

7. **Start TriviaForge**
   ```bash
   docker-compose up -d
   ```

8. **Access TriviaForge**
   - Navigate to: `http://your-casaos-ip:3000/landing.html`

## Method 2: Import Docker Compose File (Alternative)

If you prefer using the CasaOS UI:

1. **Download the compose file**
   - Download `docker-compose.casaos.yml` from the GitHub repository

2. **Open CasaOS Web UI**
   - Navigate to your CasaOS dashboard

3. **Import via Custom Install**
   - Go to App Store → Custom Install
   - Paste the contents of `docker-compose.casaos.yml`
   - **Important**: Update `ADMIN_PASSWORD` before installing!

4. **Install and Access**
   - Click Install
   - Navigate to: `http://your-casaos-ip:3000/landing.html`

> **Note**: If the import shows a white screen or fails, use Method 1 instead.

## Method 3: Direct Docker Run (Quick Test)

For a quick test without docker-compose:

```bash
docker run -d \
  --name triviaforge \
  -p 3000:3000 \
  -e APP_PORT=3000 \
  -e ADMIN_PASSWORD=your_secure_password \
  -e HOST_IP=192.168.x.x \
  -v triviaforge-quizzes:/app/quizzes \
  -v triviaforge-sessions:/app/sessions \
  --restart unless-stopped \
  emancodetemplar/triviaforge:latest
```

Replace `your_secure_password` and `192.168.x.x` with your values.

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
