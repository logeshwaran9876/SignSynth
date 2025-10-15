.PHONY: help install dev build test clean docker-up docker-down

help: ## Show this help message
	@echo "SignSynth - Text to Sign Language Video Generator"
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing worker dependencies..."
	cd worker && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose -f infra/docker-compose.dev.yml up --build

dev-backend: ## Start backend in development mode
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-worker: ## Start worker in development mode
	cd worker && celery -A celery_app worker --loglevel=info

dev-frontend: ## Start frontend in development mode
	cd frontend && npm run dev

build: ## Build all Docker images
	@echo "Building Docker images..."
	docker-compose build

test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && pytest
	@echo "Running frontend tests..."
	cd frontend && npm test
	@echo "Running integration tests..."
	python tests/test_integration.py

test-backend: ## Run backend tests only
	cd backend && pytest

test-frontend: ## Run frontend tests only
	cd frontend && npm test

lint: ## Run linting
	@echo "Linting backend..."
	cd backend && black . && isort . && flake8
	@echo "Linting frontend..."
	cd frontend && npm run lint

format: ## Format code
	@echo "Formatting backend..."
	cd backend && black . && isort .
	@echo "Formatting frontend..."
	cd frontend && npm run format

docker-up: ## Start production environment with Docker
	docker-compose -f infra/docker-compose.yml up -d

docker-down: ## Stop production environment
	docker-compose -f infra/docker-compose.yml down

clean: ## Clean up generated files
	@echo "Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	cd frontend && rm -rf node_modules dist
	cd backend && rm -rf .pytest_cache
	cd worker && rm -rf .pytest_cache

demo: ## Run demo script
	python scripts/demo.py

setup-env: ## Copy environment template
	cp env.example .env
	@echo "Please edit .env with your configuration"

logs: ## Show logs
	docker-compose logs -f

restart: ## Restart all services
	docker-compose restart

status: ## Show service status
	docker-compose ps

