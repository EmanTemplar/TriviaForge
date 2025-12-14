@echo off
REM TriviaForge Test Runner Wrapper for Windows

setlocal

echo ================================================
echo   TriviaForge Test Runner
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running
    echo Please start Docker Desktop and try again
    exit /b 1
)

REM Check if containers are running
docker-compose ps | findstr /C:"app" | findstr /C:"Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo Containers are not running. Starting them now...
    docker-compose up -d
    echo Waiting for services to be ready...
    timeout /t 5 /nobreak >nul
)

REM Determine test type
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=session

if "%TEST_TYPE%"=="session" goto session
if "%TEST_TYPE%"=="default" goto session
if "%TEST_TYPE%"=="stress" goto stress
if "%TEST_TYPE%"=="quick" goto quick
if "%TEST_TYPE%"=="verbose" goto verbose
if "%TEST_TYPE%"=="light" goto light
if "%TEST_TYPE%"=="medium" goto medium
if "%TEST_TYPE%"=="heavy" goto heavy
if "%TEST_TYPE%"=="extreme" goto extreme
if "%TEST_TYPE%"=="help" goto help
if "%TEST_TYPE%"=="-h" goto help
if "%TEST_TYPE%"=="--help" goto help
goto unknown

:session
    echo Running default session test (5 players, 3 questions)
    docker-compose exec app node testing/test-runner.js
    goto end

:stress
    echo Running stress test (20 players, 3 questions)
    docker-compose exec -e TEST_PLAYERS=20 -e TEST_VERBOSE=false app node testing/test-runner.js
    goto end

:quick
    echo Running quick test (3 players, fast mode)
    docker-compose exec -e TEST_PLAYERS=3 -e TEST_QUESTION_DELAY=1000 -e TEST_ANSWER_DELAY=500 app node testing/test-runner.js
    goto end

:verbose
    echo Running verbose test (detailed logging)
    docker-compose exec -e TEST_VERBOSE=true app node testing/test-runner.js
    goto end

:light
    echo Running light load test (5 players, 3 questions)
    docker-compose exec app node testing/test-runner.js
    goto end

:medium
    echo Running medium load test (15 players, 5 questions)
    docker-compose exec -e TEST_PLAYERS=15 app node testing/test-runner.js
    goto end

:heavy
    echo Running heavy load test (25 players, 10 questions)
    docker-compose exec -e TEST_PLAYERS=25 app node testing/test-runner.js
    goto end

:extreme
    echo Running extreme load test (50 players, 10 questions)
    docker-compose exec -e TEST_PLAYERS=50 app node testing/test-runner.js
    goto end

:help
    echo Usage: test.bat [TYPE]
    echo.
    echo Quick Tests:
    echo   quick     - Quick test (3 players, fast) - ~10s
    echo   session   - Default test (5 players, 3 questions) [default] - ~25s
    echo   verbose   - Verbose test (detailed logging) - ~25s
    echo.
    echo Stress Tests:
    echo   light     - Light load (5 players, 3 questions) - ~25s
    echo   medium    - Medium load (15 players, 5 questions) - ~45s
    echo   heavy     - Heavy load (25 players, 10 questions) - ~2min
    echo   extreme   - Extreme load (50 players, 10 questions) - ~3min
    echo   stress    - Standard stress (20 players, 3 questions) - ~1min
    echo.
    echo Other:
    echo   help      - Show this help message
    echo.
    echo Examples:
    echo   test.bat             # Run default test
    echo   test.bat quick       # Fast development test
    echo   test.bat heavy       # Test for large events
    echo.
    echo For more options, see app/testing/TESTING.md
    echo.
    pause
    exit /b 0

:unknown
    echo Unknown test type: %TEST_TYPE%
    echo Run 'test.bat help' for usage
    echo.
    pause
    exit /b 1

:end
    echo.
    echo ================================================
    echo Test complete!
    echo ================================================
    echo.
    pause
