@echo off
echo Stopping all Docker processes...

taskkill /F /IM "Docker Desktop.exe" 2>nul
taskkill /F /IM "com.docker.backend.exe" 2>nul
taskkill /F /IM "com.docker.proxy.exe" 2>nul
taskkill /F /IM "com.docker.dev-envs.exe" 2>nul
taskkill /F /IM "docker.exe" 2>nul
taskkill /F /IM "dockerd.exe" 2>nul

echo Waiting 5 seconds...
timeout /t 5 /nobreak >nul

echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Waiting 60 seconds for Docker to start...
timeout /t 60 /nobreak

echo Testing Docker...
docker ps

echo.
echo If you see "CONTAINER ID" above, Docker is ready!
echo Now run: docker-compose -f infra/docker-compose.yml up -d --build
pause
