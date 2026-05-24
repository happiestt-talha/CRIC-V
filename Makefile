# Shortcuts so you don't have to remember long Docker commands
# Usage: make up, make down, make logs, make shell-backend, etc.

.PHONY: up down build logs shell-backend shell-frontend migrate ps clean

# Start all services (development)
up:
	docker-compose up --build

# Start in background
up-d:
	docker-compose up --build -d

# Stop all services
down:
	docker-compose down

# Stop and delete all data (fresh start)
clean:
	docker-compose down -v
	docker system prune -f

# View logs from all containers
logs:
	docker-compose logs -f

# View logs from specific service
logs-backend:
	docker-compose logs -f backend

logs-worker:
	docker-compose logs -f worker

logs-frontend:
	docker-compose logs -f frontend

# Open shell inside backend container
shell-backend:
	docker-compose exec backend bash

# Open shell inside frontend container
shell-frontend:
	docker-compose exec frontend sh

# Run database migrations manually
migrate:
	docker-compose exec backend alembic upgrade head

# Show running containers
ps:
	docker-compose ps

# Production commands
prod-up:
	docker-compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f
