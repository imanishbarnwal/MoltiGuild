@echo off
echo Testing AgentGuilds Docker Setup
echo.

REM Check prerequisites
echo Checking prerequisites...

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker not found. Please install Docker Desktop first.
    exit /b 1
)
echo Docker installed

where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker Compose not found. Please install Docker Compose first.
    exit /b 1
)
echo Docker Compose installed

REM Check if .env exists
if not exist .env (
    echo .env not found. Creating from template...
    copy .env.example .env
    echo Please edit .env with your values before running docker-compose up
)
echo .env file exists

REM Test Docker build
echo.
echo Testing Docker build...
echo (This will take 5-10 minutes on first run)
echo.

docker-compose -f infra/docker-compose.yml build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo.
    echo Docker build successful!
    echo.
    echo Image: infra-agentguilds:latest
    echo Size: ~5.35GB
    echo.
    echo What's installed:
    echo - Node.js 20
    echo - Ollama (LLM runtime)
    echo - OpenClaw (AI agent framework)
    echo - Foundry (smart contract tools)
    echo.
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Edit .env with your values (contract address, private key, etc.)
    echo 2. Run: docker-compose -f infra/docker-compose.yml up -d
    echo 3. Check logs: docker logs -f agentguilds
    echo.
    echo See TEST_RESULTS.md for complete test report.
    echo.
) else (
    echo.
    echo Docker build failed. Check errors above.
    exit /b 1
)
