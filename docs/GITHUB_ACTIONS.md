# GitHub Actions CI/CD Pipeline

This document describes the comprehensive CI/CD pipeline setup for the Volcanion Auth project using GitHub Actions.

## Overview

The project uses multiple GitHub Actions workflows to ensure code quality, security, and reliable deployments:

- **CI Pipeline** (`ci.yml`) - Continuous Integration with testing and building
- **CD Pipeline** (`cd.yml`) - Continuous Deployment to staging and production
- **Security & Quality** (`security.yml`) - Security scanning and code quality checks
- **Performance Testing** (`performance.yml`) - Load testing and performance monitoring

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Test Suite**: Runs on Node.js 18.x and 20.x with MySQL and Redis services
- **Build Application**: Creates production build artifacts
- **Security Audit**: Runs npm audit and dependency checks
- **Docker Build Test**: Tests Docker image building

**Features:**
- Matrix testing across multiple Node.js versions
- Database and Redis service containers
- Test coverage reporting with Codecov
- Build artifact upload
- Security vulnerability scanning

### 2. CD Pipeline (`.github/workflows/cd.yml`)

**Triggers:**
- Push to `main` branch (staging deployment)
- Push tags starting with `v*` (production deployment)

**Jobs:**
- **Deploy to Staging**: Automatic deployment when code is pushed to main
- **Deploy to Production**: Manual approval required for tagged releases

**Features:**
- Docker image building and pushing to registry
- SSH deployment to staging and production servers
- GitHub release creation for production deployments
- Environment-specific configurations

### 3. Security & Quality (`.github/workflows/security.yml`)

**Triggers:**
- Weekly schedule (Monday 2 AM)
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Dependency Review**: Reviews new dependencies in PRs
- **Security Scan**: Snyk security scanning and npm audit
- **CodeQL Analysis**: GitHub's semantic code analysis
- **Code Quality**: ESLint, Prettier, and TypeScript checks
- **Docker Security**: Trivy and Docker Scout vulnerability scanning

### 4. Performance Testing (`.github/workflows/performance.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Daily schedule (6 AM)

**Jobs:**
- **Load Testing**: Artillery.js load testing with performance metrics
- **Lighthouse Performance**: Web performance auditing
- **Memory Leak Detection**: Clinic.js memory analysis

## Setup Instructions

### 1. Required Secrets

Add these secrets to your GitHub repository:

#### Docker Registry
```
DOCKER_REGISTRY=your-docker-registry.com
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password
```

#### Staging Environment
```
STAGING_HOST=staging.your-domain.com
STAGING_USER=deploy
STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
STAGING_PORT=22
```

#### Production Environment
```
PROD_HOST=your-domain.com
PROD_USER=deploy
PROD_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
PROD_PORT=22
```

#### Security Tools
```
SNYK_TOKEN=your-snyk-token
```

### 2. Repository Settings

1. **Branch Protection Rules**:
   - Protect `main` and `develop` branches
   - Require status checks to pass
   - Require pull request reviews

2. **Environments**:
   - Create `staging` and `production` environments
   - Add approval requirements for production

3. **Dependabot**:
   - The `.github/dependabot.yml` file is configured for automatic dependency updates

### 3. Server Setup

#### Staging and Production Servers

1. **Docker and Docker Compose**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Application Directory**:
   ```bash
   sudo mkdir -p /opt/volcanion-auth
   sudo chown deploy:deploy /opt/volcanion-auth
   ```

3. **Docker Compose Configuration**:
   Create `/opt/volcanion-auth/docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     api:
       image: your-registry/volcanion-auth:staging
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DB_HOST=mysql
         - REDIS_HOST=redis
       depends_on:
         - mysql
         - redis
     
     mysql:
       image: mysql:8.0
       environment:
         MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
         MYSQL_DATABASE: volcanion_auth
       volumes:
         - mysql_data:/var/lib/mysql
     
     redis:
       image: redis:7-alpine
       volumes:
         - redis_data:/data
   
   volumes:
     mysql_data:
     redis_data:
   ```

### 4. Performance Testing

#### Load Testing with Artillery.js

The performance testing workflow uses Artillery.js for load testing:

- **Test Configuration**: `tests/performance/auth-load-test.yml`
- **Helper Functions**: `tests/performance/auth-helpers.js`
- **Performance Thresholds**: `scripts/check-performance-regression.js`

#### Lighthouse Performance

Web performance testing using Lighthouse:

- **Configuration**: `lighthouserc.json`
- **Metrics**: Performance, Accessibility, Best Practices, SEO

### 5. Security Scanning

Multiple security tools are integrated:

1. **npm audit**: Built-in npm security scanning
2. **Snyk**: Third-party vulnerability scanning
3. **CodeQL**: GitHub's semantic analysis
4. **Trivy**: Container vulnerability scanning
5. **Docker Scout**: Docker image security analysis

### 6. Code Quality

Automated code quality checks:

1. **ESLint**: JavaScript/TypeScript linting
2. **Prettier**: Code formatting
3. **TypeScript**: Type checking
4. **Test Coverage**: Jest coverage reporting

## Monitoring and Alerts

### Performance Monitoring

- Load test results are stored as artifacts
- Performance regression detection with configurable thresholds
- Memory leak detection with Clinic.js

### Security Monitoring

- SARIF reports uploaded to GitHub Security tab
- Dependency vulnerability alerts
- Weekly security scans

### Deployment Monitoring

- Build and deployment status in GitHub Actions
- Artifact retention for debugging
- Automated rollback capabilities

## Troubleshooting

### Common Issues

1. **Failed Tests**: Check test logs and ensure all services are running
2. **Docker Build Failures**: Verify Dockerfile and dependencies
3. **Deployment Failures**: Check SSH connectivity and server resources
4. **Security Scan Failures**: Review vulnerability reports and update dependencies

### Debugging

1. **Enable Debug Logging**:
   ```yaml
   env:
     ACTIONS_STEP_DEBUG: true
   ```

2. **SSH into Runners** (for debugging):
   ```yaml
   - name: Setup tmate session
     uses: mxschmitt/action-tmate@v3
   ```

## Best Practices

1. **Keep secrets secure** - Never commit secrets to code
2. **Use environment-specific configurations**
3. **Monitor performance metrics regularly**
4. **Keep dependencies updated** with Dependabot
5. **Review security scan results** and fix vulnerabilities promptly
6. **Test deployments** in staging before production
7. **Use semantic versioning** for releases
8. **Document changes** in pull requests

## Contributing

When contributing to this project:

1. Ensure all CI checks pass
2. Add tests for new features
3. Update documentation if needed
4. Follow the existing code style
5. Keep security in mind
