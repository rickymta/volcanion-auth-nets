# Docker management scripts for Volcanion Auth (Windows PowerShell)

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod", "build", "stop", "clean", "logs", "status", "setup")]
    [string]$Command
)

$COMPOSE_FILE = "docker-compose.yml"
$DEV_COMPOSE_FILE = "docker-compose.dev.yml"
$ENV_FILE = ".env.production"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed"
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed"
        exit 1
    }
}

function Setup-Production {
    Write-Info "Setting up production environment..."
    
    # Copy environment file if it doesn't exist
    if (-not (Test-Path $ENV_FILE)) {
        if (Test-Path ".env.production.example") {
            Copy-Item ".env.production.example" $ENV_FILE
            Write-Warning "Created $ENV_FILE from example. Please edit it with your values."
        } else {
            Write-Error ".env.production.example not found"
            exit 1
        }
    }
    
    # Create SSL directory
    if (-not (Test-Path "nginx/ssl")) {
        New-Item -ItemType Directory -Path "nginx/ssl" -Force | Out-Null
    }
    
    # Generate self-signed certificate if not exists
    if (-not (Test-Path "nginx/ssl/cert.pem")) {
        Write-Info "Generating self-signed SSL certificate..."
        # For Windows, you might need to install OpenSSL or use PowerShell PKI module
        Write-Warning "Please manually generate SSL certificates for nginx/ssl/"
        Write-Info "cert.pem and key.pem are required"
    }
    
    # Create directories
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    if (-not (Test-Path "uploads")) {
        New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
    }
    
    Write-Success "Production environment setup complete"
}

function Start-Dev {
    Write-Info "Starting development environment..."
    docker-compose -f $DEV_COMPOSE_FILE up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Development environment started"
        Write-Info "API available at: http://localhost:3000"
        Write-Info "Health check: http://localhost:3000/api/v1/health"
    }
}

function Start-Prod {
    Write-Info "Starting production environment..."
    
    if (-not (Test-Path $ENV_FILE)) {
        Write-Error "$ENV_FILE not found. Run 'docker.ps1 setup' first."
        exit 1
    }
    
    docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production environment started"
        Write-Info "API available at: https://localhost"
        Write-Info "Health check: https://localhost/health"
    }
}

function Build-Prod {
    Write-Info "Building production image..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production image built successfully"
    }
}

function Stop-Services {
    Write-Info "Stopping all services..."
    docker-compose -f $DEV_COMPOSE_FILE down 2>$null
    docker-compose -f $COMPOSE_FILE down 2>$null
    Write-Success "All services stopped"
}

function Clean-All {
    $response = Read-Host "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Info "Cleaning up..."
        docker-compose -f $DEV_COMPOSE_FILE down -v --rmi all 2>$null
        docker-compose -f $COMPOSE_FILE down -v --rmi all 2>$null
        docker system prune -f
        Write-Success "Cleanup complete"
    } else {
        Write-Info "Cleanup cancelled"
    }
}

function Show-Logs {
    $devRunning = docker-compose -f $DEV_COMPOSE_FILE ps -q app 2>$null
    $prodRunning = docker-compose -f $COMPOSE_FILE ps -q app 2>$null
    
    if ($devRunning) {
        Write-Info "Showing development logs..."
        docker-compose -f $DEV_COMPOSE_FILE logs -f app
    } elseif ($prodRunning) {
        Write-Info "Showing production logs..."
        docker-compose -f $COMPOSE_FILE logs -f app
    } else {
        Write-Error "No running services found"
    }
}

function Show-Status {
    Write-Info "Service Status:"
    Write-Host ""
    Write-Host "Development:"
    try {
        docker-compose -f $DEV_COMPOSE_FILE ps
    } catch {
        Write-Host "Not running"
    }
    Write-Host ""
    Write-Host "Production:"
    try {
        docker-compose -f $COMPOSE_FILE ps
    } catch {
        Write-Host "Not running"
    }
}

# Main script
Test-Docker

switch ($Command) {
    "dev" { Start-Dev }
    "prod" { Start-Prod }
    "build" { Build-Prod }
    "stop" { Stop-Services }
    "clean" { Clean-All }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "setup" { Setup-Production }
}
