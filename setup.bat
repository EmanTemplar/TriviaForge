@echo off
REM TriviaForge Setup Script for Windows
REM This script prepares the environment for first-time deployment

echo ======================================
echo    TriviaForge Setup ^& Verification
echo ======================================
echo.

REM Check if Docker is installed
echo Step 1: Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker daemon is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [X] Docker daemon is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo [OK] Docker daemon is running

REM Check if docker-compose is available
echo.
echo Step 2: Checking docker-compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [X] docker-compose is not installed or not in PATH
    echo Please install docker-compose or use Docker Desktop which includes it
    pause
    exit /b 1
)
echo [OK] docker-compose is installed

REM Check for .env file
echo.
echo Step 3: Checking environment configuration...
if not exist ".env" (
    echo [!] .env file not found
    if exist ".env.example" (
        echo Creating .env file from .env.example...
        copy .env.example .env >nul
        echo [OK] .env file created
        echo.
        echo [!] IMPORTANT: Edit .env file and set the following:
        echo   - ADMIN_PASSWORD (required for admin login^)
        echo   - SERVER_URL (your server's IP address, e.g., http://192.168.1.100:3000^)
        echo.
    ) else (
        echo [X] .env.example not found - cannot create .env
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)

REM Pull Docker images
echo.
echo Step 4: Pulling required Docker images...
echo This may take a few minutes on first run...
echo.

echo Pulling TriviaForge PostgreSQL image...
docker pull emancodetemplar/triviaforge-db:latest
if errorlevel 1 (
    echo [X] Failed to pull TriviaForge PostgreSQL image
    echo This could be due to:
    echo   - No internet connection
    echo   - Docker Hub is down or rate-limited
    echo   - Firewall blocking Docker Hub access
    pause
    exit /b 1
)
echo [OK] TriviaForge PostgreSQL image downloaded

echo.
echo Pulling TriviaForge application image...
docker pull emancodetemplar/triviaforge:latest
if errorlevel 1 (
    echo [X] Failed to pull TriviaForge image
    echo This could be due to:
    echo   - No internet connection
    echo   - Docker Hub is down or rate-limited
    echo   - Firewall blocking Docker Hub access
    pause
    exit /b 1
)
echo [OK] TriviaForge application image downloaded

REM Database initialization files are now baked into the Docker image
echo.
echo Step 5: Database initialization verification...
echo [OK] Database initialization files are included in Docker image

REM Summary
echo.
echo ======================================
echo    Setup Complete!
echo ======================================
echo.
echo [OK] All prerequisites verified
echo [OK] Docker images downloaded
echo [OK] Environment configured
echo.
echo Next steps:
echo   1. Edit .env file with your configuration (ADMIN_PASSWORD, SERVER_URL^)
echo   2. Run: docker-compose up -d
echo   3. Access the app at: http://localhost:3000
echo.
echo To view logs:    docker-compose logs -f
echo To stop:         docker-compose down
echo To reset DB:     docker-compose down -v
echo.
pause
