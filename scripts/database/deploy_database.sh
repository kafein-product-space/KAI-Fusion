#!/bin/bash
# ==============================================================
# KAI-Fusion Database Deployment Script
# Production-ready PostgreSQL deployment automation
# ==============================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ==============================================================
# CONFIGURATION
# ==============================================================

# Default values (can be overridden by environment variables)
DB_NAME="${DB_NAME:-kai_fusion_prod}"
DB_USER="${DB_USER:-kai_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_VERSION="${POSTGRES_VERSION:-14}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kai-fusion}"
LOG_DIR="${LOG_DIR:-/var/log/kai-fusion}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================
# UTILITY FUNCTIONS
# ==============================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${BLUE}[INFO]${NC}  $timestamp - $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" ;;
    esac
    
    # Also log to file if log directory exists
    if [[ -d "$LOG_DIR" ]]; then
        echo "[$level] $timestamp - $message" >> "$LOG_DIR/deployment.log"
    fi
}

check_requirements() {
    log "INFO" "Checking system requirements..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        log "ERROR" "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    log "INFO" "Detected OS: $PRETTY_NAME"
    
    # Check required commands
    local required_commands=("curl" "wget" "gpg")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log "ERROR" "Insufficient disk space. Required: 10GB, Available: $((available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    log "SUCCESS" "System requirements check passed"
}

install_postgresql() {
    log "INFO" "Installing PostgreSQL $POSTGRES_VERSION..."
    
    # Detect package manager and install accordingly
    if command -v apt-get &> /dev/null; then
        install_postgresql_debian
    elif command -v yum &> /dev/null; then
        install_postgresql_rhel
    elif command -v dnf &> /dev/null; then
        install_postgresql_fedora
    else
        log "ERROR" "Unsupported package manager. Please install PostgreSQL manually."
        exit 1
    fi
}

install_postgresql_debian() {
    log "INFO" "Installing PostgreSQL on Debian/Ubuntu..."
    
    # Update package list
    apt-get update
    
    # Install required packages
    apt-get install -y curl ca-certificates gnupg lsb-release
    
    # Add PostgreSQL official APT repository
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    # Update package list with new repository
    apt-get update
    
    # Install PostgreSQL
    apt-get install -y "postgresql-$POSTGRES_VERSION" "postgresql-contrib-$POSTGRES_VERSION"
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log "SUCCESS" "PostgreSQL installed successfully"
}

install_postgresql_rhel() {
    log "INFO" "Installing PostgreSQL on RHEL/CentOS..."
    
    # Install EPEL repository
    yum install -y epel-release
    
    # Install PostgreSQL repository
    yum install -y "https://download.postgresql.org/pub/repos/yum/reporpms/EL-$(rpm -E %{rhel})-x86_64/pgdg-redhat-repo-latest.noarch.rpm"
    
    # Install PostgreSQL
    yum install -y "postgresql$POSTGRES_VERSION-server" "postgresql$POSTGRES_VERSION-contrib"
    
    # Initialize database
    "/usr/pgsql-$POSTGRES_VERSION/bin/postgresql-$POSTGRES_VERSION-setup" initdb
    
    # Start and enable PostgreSQL
    systemctl start "postgresql-$POSTGRES_VERSION"
    systemctl enable "postgresql-$POSTGRES_VERSION"
    
    log "SUCCESS" "PostgreSQL installed successfully"
}

install_postgresql_fedora() {
    log "INFO" "Installing PostgreSQL on Fedora..."
    
    # Install PostgreSQL
    dnf install -y "postgresql-server" "postgresql-contrib"
    
    # Initialize database
    postgresql-setup --initdb
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log "SUCCESS" "PostgreSQL installed successfully"
}

configure_postgresql() {
    log "INFO" "Configuring PostgreSQL for production..."
    
    # Find PostgreSQL configuration directory
    local pg_config_dir
    if [[ -d "/etc/postgresql/$POSTGRES_VERSION/main" ]]; then
        pg_config_dir="/etc/postgresql/$POSTGRES_VERSION/main"
    elif [[ -d "/var/lib/pgsql/$POSTGRES_VERSION/data" ]]; then
        pg_config_dir="/var/lib/pgsql/$POSTGRES_VERSION/data"
    else
        pg_config_dir="/var/lib/postgresql/data"
    fi
    
    log "INFO" "PostgreSQL config directory: $pg_config_dir"
    
    # Backup original configuration
    cp "$pg_config_dir/postgresql.conf" "$pg_config_dir/postgresql.conf.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$pg_config_dir/pg_hba.conf" "$pg_config_dir/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Apply production configuration
    configure_postgresql_conf "$pg_config_dir"
    configure_pg_hba "$pg_config_dir"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    chown postgres:postgres "$LOG_DIR"
    chmod 755 "$LOG_DIR"
    
    # Restart PostgreSQL to apply changes
    systemctl restart postgresql
    
    log "SUCCESS" "PostgreSQL configuration completed"
}

configure_postgresql_conf() {
    local config_dir=$1
    local config_file="$config_dir/postgresql.conf"
    
    log "INFO" "Configuring postgresql.conf..."
    
    # Calculate memory settings based on available RAM
    local total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_ram_mb=$((total_ram_kb / 1024))
    local shared_buffers_mb=$((total_ram_mb / 4))
    local effective_cache_size_mb=$((total_ram_mb * 3 / 4))
    
    # Ensure minimum values
    if [[ $shared_buffers_mb -lt 128 ]]; then
        shared_buffers_mb=128
    fi
    if [[ $effective_cache_size_mb -lt 256 ]]; then
        effective_cache_size_mb=256
    fi
    
    cat >> "$config_file" << EOF

# ==============================================================
# KAI-Fusion Production Configuration
# Applied on $(date)
# ==============================================================

# Connection Settings
listen_addresses = '*'
port = $DB_PORT
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = ${shared_buffers_mb}MB
effective_cache_size = ${effective_cache_size_mb}MB
work_mem = 8MB
maintenance_work_mem = 128MB
dynamic_shared_memory_type = posix

# Checkpoint Settings
wal_level = replica
wal_buffers = 16MB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 2GB
min_wal_size = 512MB

# Performance Tuning
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '$LOG_DIR'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_file_mode = 0640
log_rotation_age = 1d
log_rotation_size = 100MB
log_truncate_on_rotation = on
log_min_duration_statement = 5000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_lock_waits = on
log_checkpoints = on

# Autovacuum
autovacuum = on
log_autovacuum_min_duration = 1000ms
autovacuum_max_workers = 3
autovacuum_naptime = 30s

# Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all

EOF

    log "SUCCESS" "postgresql.conf configured"
}

configure_pg_hba() {
    local config_dir=$1
    local hba_file="$config_dir/pg_hba.conf"
    
    log "INFO" "Configuring pg_hba.conf..."
    
    # Add KAI-Fusion specific authentication rules
    cat >> "$hba_file" << EOF

# ==============================================================
# KAI-Fusion Authentication Configuration
# ==============================================================

# Local connections
local   all             postgres                                peer
local   $DB_NAME        $DB_USER                                md5

# IPv4 local connections
host    all             postgres        127.0.0.1/32            md5
host    $DB_NAME        $DB_USER        127.0.0.1/32            md5

# Application server connections
host    $DB_NAME        $DB_USER        10.0.0.0/8              md5
host    $DB_NAME        $DB_USER        172.16.0.0/12           md5
host    $DB_NAME        $DB_USER        192.168.0.0/16          md5

# SSL connections for production
hostssl $DB_NAME        $DB_USER        0.0.0.0/0               md5

EOF

    log "SUCCESS" "pg_hba.conf configured"
}

create_database_and_user() {
    log "INFO" "Creating database and user..."
    
    # Generate secure password if not provided
    if [[ -z "$DB_PASSWORD" ]]; then
        DB_PASSWORD=$(openssl rand -base64 32)
        log "INFO" "Generated secure password for database user"
        echo "Database Password: $DB_PASSWORD" > "$PROJECT_ROOT/database_credentials.txt"
        chmod 600 "$PROJECT_ROOT/database_credentials.txt"
        log "INFO" "Password saved to: $PROJECT_ROOT/database_credentials.txt"
    fi
    
    # Create database and user
    sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME

GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Create monitoring user
CREATE USER kai_monitor WITH PASSWORD '$(openssl rand -base64 16)';
GRANT pg_monitor TO kai_monitor;
GRANT CONNECT ON DATABASE $DB_NAME TO kai_monitor;

\q
EOF

    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Database and user created successfully"
    else
        log "ERROR" "Failed to create database and user"
        exit 1
    fi
}

deploy_schema() {
    log "INFO" "Deploying database schema..."
    
    local schema_file="$PROJECT_ROOT/create_kai_fusion_schema.sql"
    
    # Check if schema file exists
    if [[ ! -f "$schema_file" ]]; then
        log "ERROR" "Schema file not found: $schema_file"
        log "INFO" "Creating schema file from template..."
        create_schema_file "$schema_file"
    fi
    
    # Deploy schema
    sudo -u postgres psql -d "$DB_NAME" -f "$schema_file"
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Database schema deployed successfully"
    else
        log "ERROR" "Failed to deploy database schema"
        exit 1
    fi
    
    # Verify deployment
    verify_schema_deployment
}

create_schema_file() {
    local schema_file=$1
    
    log "INFO" "Creating schema file..."
    
    cat > "$schema_file" << 'EOF'
-- KAI-Fusion Database Schema
-- This file is auto-generated by the deployment script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    flow_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inputs JSONB,
    outputs JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User credentials table
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_credential_name UNIQUE (user_id, name)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO users (email, full_name, password_hash, role) VALUES
('admin@kai-fusion.local', 'System Administrator', crypt('admin123', gen_salt('bf', 8)), 'admin');

EOF
    
    log "SUCCESS" "Schema file created: $schema_file"
}

verify_schema_deployment() {
    log "INFO" "Verifying schema deployment..."
    
    local table_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    
    if [[ $table_count -ge 4 ]]; then
        log "SUCCESS" "Schema verification passed: $table_count tables created"
    else
        log "ERROR" "Schema verification failed: Expected 4+ tables, found $table_count"
        exit 1
    fi
}

setup_ssl() {
    log "INFO" "Setting up SSL certificates..."
    
    local ssl_dir="/etc/postgresql/ssl"
    mkdir -p "$ssl_dir"
    
    # Generate self-signed certificate for development/testing
    openssl req -new -x509 -days 365 -nodes -text \
        -out "$ssl_dir/server.crt" \
        -keyout "$ssl_dir/server.key" \
        -subj "/CN=kai-fusion-db"
    
    chmod 600 "$ssl_dir/server.key"
    chmod 644 "$ssl_dir/server.crt"
    chown postgres:postgres "$ssl_dir/server.key" "$ssl_dir/server.crt"
    
    # Update PostgreSQL configuration
    sudo -u postgres psql -c "ALTER SYSTEM SET ssl = on;"
    sudo -u postgres psql -c "ALTER SYSTEM SET ssl_cert_file = '$ssl_dir/server.crt';"
    sudo -u postgres psql -c "ALTER SYSTEM SET ssl_key_file = '$ssl_dir/server.key';"
    
    systemctl restart postgresql
    
    log "SUCCESS" "SSL certificates configured"
}

setup_backup() {
    log "INFO" "Setting up automated backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    chown postgres:postgres "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
    
    # Create backup script
    cat > "/usr/local/bin/kai-fusion-backup" << EOF
#!/bin/bash
# KAI-Fusion Database Backup Script

DB_NAME="$DB_NAME"
DB_USER="postgres"
BACKUP_DIR="$BACKUP_DIR"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U "\$DB_USER" -d "\$DB_NAME" --clean --if-exists > "\$BACKUP_DIR/kai_fusion_backup_\$TIMESTAMP.sql"

# Compress backup
gzip "\$BACKUP_DIR/kai_fusion_backup_\$TIMESTAMP.sql"

# Remove backups older than 30 days
find "\$BACKUP_DIR" -name "kai_fusion_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: \$TIMESTAMP"
EOF

    chmod +x "/usr/local/bin/kai-fusion-backup"
    
    # Setup cron job for daily backup at 2 AM
    echo "0 2 * * * /usr/local/bin/kai-fusion-backup" | crontab -u postgres -
    
    log "SUCCESS" "Automated backup configured"
}

setup_monitoring() {
    log "INFO" "Setting up database monitoring..."
    
    # Enable pg_stat_statements
    sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
    
    # Create monitoring script
    cat > "/usr/local/bin/kai-fusion-monitor" << EOF
#!/bin/bash
# KAI-Fusion Database Monitoring Script

DB_NAME="$DB_NAME"
LOG_FILE="$LOG_DIR/monitor.log"

# Check database health
CONNECTIONS=\$(sudo -u postgres psql -d "\$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "0")
DB_SIZE=\$(sudo -u postgres psql -d "\$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('\$DB_NAME'));" 2>/dev/null || echo "Unknown")

echo "\$(date '+%Y-%m-%d %H:%M:%S') - Active Connections: \$CONNECTIONS, DB Size: \$DB_SIZE" >> "\$LOG_FILE"

# Alert if too many connections
if [[ \$CONNECTIONS -gt 150 ]]; then
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - WARNING: High connection count: \$CONNECTIONS" >> "\$LOG_FILE"
fi
EOF

    chmod +x "/usr/local/bin/kai-fusion-monitor"
    
    # Setup cron job for monitoring every 5 minutes
    echo "*/5 * * * * /usr/local/bin/kai-fusion-monitor" | crontab -
    
    log "SUCCESS" "Database monitoring configured"
}

create_summary() {
    log "INFO" "Creating deployment summary..."
    
    local summary_file="$PROJECT_ROOT/deployment_summary.txt"
    
    cat > "$summary_file" << EOF
==============================================================
KAI-Fusion Database Deployment Summary
Deployment Date: $(date)
==============================================================

Database Configuration:
- Database Name: $DB_NAME
- Database User: $DB_USER
- Database Host: $DB_HOST
- Database Port: $DB_PORT
- PostgreSQL Version: $POSTGRES_VERSION

Directories:
- Backup Directory: $BACKUP_DIR
- Log Directory: $LOG_DIR
- Config Directory: $(sudo -u postgres psql -t -c "SHOW config_file;" | sed 's|/[^/]*$||')

Credentials:
- Database password saved to: $PROJECT_ROOT/database_credentials.txt
- Please secure this file and remove it after noting the password

Connection String:
- postgresql://$DB_USER:[PASSWORD]@$DB_HOST:$DB_PORT/$DB_NAME

Services Configured:
- PostgreSQL service: Active
- Automated backup: Daily at 2:00 AM
- Database monitoring: Every 5 minutes
- SSL encryption: Enabled

Next Steps:
1. Update your application configuration with the database connection details
2. Secure the database credentials file
3. Test the database connection from your application
4. Configure firewall rules if needed
5. Set up external monitoring if required

For support, check the logs in: $LOG_DIR
==============================================================
EOF

    log "SUCCESS" "Deployment summary created: $summary_file"
}

# ==============================================================
# MAIN DEPLOYMENT PROCESS
# ==============================================================

main() {
    log "INFO" "Starting KAI-Fusion database deployment..."
    
    # Check if PostgreSQL is already installed
    if command -v psql &> /dev/null; then
        log "INFO" "PostgreSQL is already installed, skipping installation"
    else
        check_requirements
        install_postgresql
    fi
    
    # Configure PostgreSQL
    configure_postgresql
    
    # Create database and user
    create_database_and_user
    
    # Deploy schema
    deploy_schema
    
    # Setup SSL
    setup_ssl
    
    # Setup backup
    setup_backup
    
    # Setup monitoring
    setup_monitoring
    
    # Create deployment summary
    create_summary
    
    log "SUCCESS" "KAI-Fusion database deployment completed successfully!"
    log "INFO" "Please review the deployment summary: $PROJECT_ROOT/deployment_summary.txt"
}

# ==============================================================
# SCRIPT EXECUTION
# ==============================================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --postgres-version)
            POSTGRES_VERSION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --db-name NAME          Database name (default: kai_fusion_prod)"
            echo "  --db-user USER          Database user (default: kai_user)"
            echo "  --db-password PASS      Database password (default: auto-generated)"
            echo "  --db-host HOST          Database host (default: localhost)"
            echo "  --db-port PORT          Database port (default: 5432)"
            echo "  --postgres-version VER  PostgreSQL version (default: 14)"
            echo "  --help                  Show this help message"
            echo ""
            echo "Example:"
            echo "  sudo $0 --db-name my_kai_fusion --db-user my_user"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main deployment
main "$@"