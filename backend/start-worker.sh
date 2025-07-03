#!/bin/bash

# Celery Worker Startup Script for Flows FastAPI
# Usage: ./start-worker.sh [development|production]

set -e

# Configuration
ENV=${1:-development}
WORKER_NAME="flows-worker-$(hostname)-$$"
LOG_LEVEL=${LOG_LEVEL:-info}
CONCURRENCY=${CONCURRENCY:-4}
MAX_TASKS_PER_CHILD=${MAX_TASKS_PER_CHILD:-1000}
QUEUES=${QUEUES:-workflows,monitoring}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Celery Worker for Flows FastAPI${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"
echo -e "${BLUE}Worker Name: ${WORKER_NAME}${NC}"
echo -e "${BLUE}Concurrency: ${CONCURRENCY}${NC}"
echo -e "${BLUE}Queues: ${QUEUES}${NC}"

# Check if Redis is available
echo -e "${YELLOW}📡 Checking Redis connection...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is available${NC}"
    else
        echo -e "${RED}❌ Redis is not responding. Please start Redis first.${NC}"
        echo -e "${YELLOW}💡 You can start Redis with: redis-server${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not found. Assuming Redis is running...${NC}"
fi

# Check if required Python packages are installed
echo -e "${YELLOW}📦 Checking Python dependencies...${NC}"
python -c "import celery; import redis" 2>/dev/null || {
    echo -e "${RED}❌ Required packages not installed. Please run: pip install -r requirements.txt${NC}"
    exit 1
}
echo -e "${GREEN}✅ Python dependencies are available${NC}"

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export CELERY_BROKER_URL=${REDIS_URL:-"redis://localhost:6379/0"}
export CELERY_RESULT_BACKEND=${REDIS_URL:-"redis://localhost:6379/0"}

# Development vs Production configuration
if [ "$ENV" = "production" ]; then
    echo -e "${YELLOW}🏭 Production mode - optimized settings${NC}"
    WORKER_OPTS="--loglevel=warning --concurrency=${CONCURRENCY} --max-tasks-per-child=${MAX_TASKS_PER_CHILD}"
    PREFETCH_MULTIPLIER=1
    TIME_LIMIT=3600  # 1 hour
    SOFT_TIME_LIMIT=3300  # 55 minutes
else
    echo -e "${YELLOW}🛠️  Development mode - verbose settings${NC}"
    WORKER_OPTS="--loglevel=${LOG_LEVEL} --concurrency=${CONCURRENCY}"
    PREFETCH_MULTIPLIER=4
    TIME_LIMIT=1800  # 30 minutes
    SOFT_TIME_LIMIT=1500  # 25 minutes
fi

# Create log directory
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

# Function to handle shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down Celery worker...${NC}"
    if [ ! -z "$CELERY_PID" ]; then
        kill $CELERY_PID 2>/dev/null || true
        wait $CELERY_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Worker stopped cleanly${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Celery worker
echo -e "${GREEN}🎯 Starting Celery worker...${NC}"

if [ "$ENV" = "production" ]; then
    # Production: Log to file and run in background
    celery -A app.core.celery_app worker \
        --name="$WORKER_NAME" \
        --queues="$QUEUES" \
        --prefetch-multiplier=$PREFETCH_MULTIPLIER \
        --time-limit=$TIME_LIMIT \
        --soft-time-limit=$SOFT_TIME_LIMIT \
        --logfile="$LOG_DIR/worker.log" \
        --pidfile="$LOG_DIR/worker.pid" \
        $WORKER_OPTS &
    
    CELERY_PID=$!
    echo -e "${GREEN}✅ Worker started with PID: $CELERY_PID${NC}"
    echo -e "${BLUE}📋 Log file: $LOG_DIR/worker.log${NC}"
    echo -e "${BLUE}📋 PID file: $LOG_DIR/worker.pid${NC}"
    
    # Monitor the worker
    echo -e "${YELLOW}👀 Monitoring worker... (Press Ctrl+C to stop)${NC}"
    wait $CELERY_PID
else
    # Development: Interactive mode
    exec celery -A app.core.celery_app worker \
        --name="$WORKER_NAME" \
        --queues="$QUEUES" \
        --prefetch-multiplier=$PREFETCH_MULTIPLIER \
        --time-limit=$TIME_LIMIT \
        --soft-time-limit=$SOFT_TIME_LIMIT \
        $WORKER_OPTS
fi 