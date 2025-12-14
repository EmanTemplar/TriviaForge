#!/bin/bash

# TriviaForge Test Runner Wrapper
# Makes testing easy from project root

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  TriviaForge Test Runner${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker and try again${NC}"
    exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep -q "app.*Up"; then
    echo -e "${YELLOW}Containers are not running. Starting them now...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Waiting for services to be ready...${NC}"
    sleep 5
fi

# Determine test type
TEST_TYPE="${1:-session}"

case "$TEST_TYPE" in
    "session"|"default")
        echo -e "${BLUE}Running default session test (5 players, 3 questions)${NC}"
        docker-compose exec app node testing/test-runner.js
        ;;
    "stress")
        echo -e "${BLUE}Running stress test (20 players, 3 questions)${NC}"
        docker-compose exec -e TEST_PLAYERS=20 -e TEST_VERBOSE=false app node testing/test-runner.js
        ;;
    "quick")
        echo -e "${BLUE}Running quick test (3 players, fast mode)${NC}"
        docker-compose exec -e TEST_PLAYERS=3 -e TEST_QUESTION_DELAY=1000 -e TEST_ANSWER_DELAY=500 app node testing/test-runner.js
        ;;
    "verbose")
        echo -e "${BLUE}Running verbose test (detailed logging)${NC}"
        docker-compose exec -e TEST_VERBOSE=true app node testing/test-runner.js
        ;;
    "light")
        echo -e "${BLUE}Running light load test (5 players, 3 questions)${NC}"
        docker-compose exec app node testing/test-runner.js
        ;;
    "medium")
        echo -e "${BLUE}Running medium load test (15 players, 5 questions)${NC}"
        docker-compose exec -e TEST_PLAYERS=15 app node testing/test-runner.js
        ;;
    "heavy")
        echo -e "${BLUE}Running heavy load test (25 players, 10 questions)${NC}"
        docker-compose exec -e TEST_PLAYERS=25 app node testing/test-runner.js
        ;;
    "extreme")
        echo -e "${BLUE}Running extreme load test (50 players, 10 questions)${NC}"
        docker-compose exec -e TEST_PLAYERS=50 app node testing/test-runner.js
        ;;
    "help"|"-h"|"--help")
        echo "Usage: ./test.sh [TYPE]"
        echo ""
        echo "Quick Tests:"
        echo "  quick     - Quick test (3 players, fast) - ~10s"
        echo "  session   - Default test (5 players, 3 questions) [default] - ~25s"
        echo "  verbose   - Verbose test (detailed logging) - ~25s"
        echo ""
        echo "Stress Tests:"
        echo "  light     - Light load (5 players, 3 questions) - ~25s"
        echo "  medium    - Medium load (15 players, 5 questions) - ~45s"
        echo "  heavy     - Heavy load (25 players, 10 questions) - ~2min"
        echo "  extreme   - Extreme load (50 players, 10 questions) - ~3min"
        echo "  stress    - Standard stress (20 players, 3 questions) - ~1min"
        echo ""
        echo "Other:"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./test.sh             # Run default test"
        echo "  ./test.sh quick       # Fast development test"
        echo "  ./test.sh heavy       # Test for large events"
        echo ""
        echo "For more options, see app/testing/TESTING.md"
        echo ""
        read -n 1 -s -r -p "Press any key to continue..."
        echo ""
        exit 0
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Run './test.sh help' for usage"
        echo ""
        read -n 1 -s -r -p "Press any key to continue..."
        echo ""
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}Test complete!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
read -n 1 -s -r -p "Press any key to continue..."
echo ""
