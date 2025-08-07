# Docker Deployment Guide

This guide explains how to deploy the Volcanion Auth application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM
- At least 5GB disk space

## Quick Start

### Development Environment

```bash
# Start development environment
./scripts/docker.sh dev

# Or on Windows
.\scripts\docker.ps1 dev
```

### Production Environment

```bash
# Setup production environment
./scripts/docker.sh setup

# Edit environment variables
nano .env.production

# Start production environment
./scripts/docker.sh prod

# Or on Windows
.\scripts\docker.ps1 setup
.\scripts\docker.ps1 prod
```

## Services

### Development Stack
- **MySQL 8.0** - Database (port 3306)
- **Redis 7** - Cache and sessions (port 6379)
- **Node.js App** - API server with hot reload (port 3000)

### Production Stack
- **MySQL 8.0** - Database (internal)
- **Redis 7** - Cache and sessions (internal)
- **Node.js App** - API server (internal)
- **Nginx** - Reverse proxy and SSL termination (ports 80, 443)

## Configuration

### Environment Variables

Copy `.env.production.example` to `.env.production` and configure:

```env
# Database
DB_USER=volcanion_user
DB_PASSWORD=your_secure_db_password
DB_NAME=volcanion_auth
DB_ROOT_PASSWORD=your_secure_root_password

# Redis
REDIS_PASSWORD=your_secure_redis_password

# JWT Secrets (MUST be changed in production)
JWT_ACCESS_SECRET=your-super-secret-access-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### SSL Certificates

For production, place your SSL certificates in `nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

Or use the auto-generated self-signed certificate for testing.

## Management Commands

### Using Scripts

```bash
# Development
./scripts/docker.sh dev          # Start development
./scripts/docker.sh logs         # View logs
./scripts/docker.sh stop         # Stop services

# Production
./scripts/docker.sh setup        # Setup production
./scripts/docker.sh prod         # Start production
./scripts/docker.sh build        # Build production image
./scripts/docker.sh status       # Check status
./scripts/docker.sh clean        # Clean up everything
```

### Manual Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f app
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose --env-file .env.production up -d
docker-compose logs -f app
docker-compose down
```

## Health Checks

### Development
- API Health: http://localhost:3000/api/v1/health
- MySQL: `docker exec volcanion-mysql-dev mysqladmin ping`
- Redis: `docker exec volcanion-redis-dev redis-cli ping`

### Production
- External Health: https://localhost/health
- Internal Health: https://localhost/api/v1/health

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mysql
docker-compose logs -f redis
docker-compose logs -f nginx
```

### Service Status
```bash
# Check running containers
docker-compose ps

# Check resource usage
docker stats
```

## Database Management

### Backup Database
```bash
docker exec volcanion-mysql mysqldump -u root -p volcanion_auth > backup.sql
```

### Restore Database
```bash
docker exec -i volcanion-mysql mysql -u root -p volcanion_auth < backup.sql
```

### Access Database
```bash
docker exec -it volcanion-mysql mysql -u root -p
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   netstat -tlnp | grep :3000
   # Kill the process or change ports in docker-compose
   ```

2. **Permission denied**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x scripts/docker.sh
   ```

3. **Database connection failed**
   ```bash
   # Check MySQL container
   docker logs volcanion-mysql
   # Verify environment variables
   docker exec volcanion-app env | grep DB_
   ```

4. **SSL certificate errors**
   ```bash
   # Regenerate self-signed certificate
   openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes
   ```

### Reset Everything
```bash
# Stop and remove everything
./scripts/docker.sh clean

# Start fresh
./scripts/docker.sh setup
./scripts/docker.sh prod
```

## Security Considerations

### Production Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Configure proper SSL certificates
- [ ] Review nginx security headers
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

### Network Security
- All internal services communicate through Docker network
- Only nginx exposes external ports (80, 443)
- Database and Redis are not directly accessible
- Rate limiting configured in nginx

## Performance Tuning

### Resource Limits
Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Database Optimization
```yaml
mysql:
  environment:
    MYSQL_INNODB_BUFFER_POOL_SIZE: 256M
    MYSQL_MAX_CONNECTIONS: 100
```

## Scaling

### Horizontal Scaling
```yaml
services:
  app:
    deploy:
      replicas: 3
```

### Load Balancing
Nginx is configured to support multiple app instances automatically.

## Updates

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
./scripts/docker.sh build
./scripts/docker.sh prod
```

### Update Dependencies
```bash
# Update base images
docker-compose pull
./scripts/docker.sh prod
```
