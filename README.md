<<<<<<< HEAD
# SignSynth — Realistic Text → Sign Language Video

A production-grade, end-to-end web application that converts plain text into realistic sign-language videos using AI-powered pose generation and 3D rendering.

## Features

- 🎬 **Real-time sign preview** for short phrases
- 🎥 **Full-video generation (HD)** for longer text blocks
- 🤖 **AI-powered pose generation** using Gemini API
- 🎭 **Natural facial expressions** and gestures
- ⚡ **Asynchronous processing** with Redis + Celery
- 🎨 **Modern React frontend** with TypeScript
- 🚀 **FastAPI backend** with comprehensive API
- 🐳 **Docker-ready** for easy deployment

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+
- Redis server
- FFmpeg

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your API keys and configuration:
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379

# Optional
S3_BUCKET=your_bucket_name
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
```

### Running with Docker

```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Local Development

1. **Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

2. **Worker Setup:**
```bash
cd worker
pip install -r requirements.txt
celery -A celery_app worker --loglevel=info
```

3. **Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

## API Documentation

Once running, visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Architecture

### Backend (FastAPI)
- **API Routes**: Job submission, status checking, admin dashboard
- **Models**: Pydantic models for request/response validation
- **Authentication**: API key-based authentication
- **Storage**: Local filesystem + S3-compatible storage

### Worker (Celery)
- **Gemini Integration**: Text-to-pose conversion using AI
- **Rendering Pipeline**: Blender headless + WebGL fallback
- **Video Assembly**: FFmpeg for final video creation
- **Queue Management**: Redis-based job queuing

### Frontend (React + TypeScript)
- **Real-time Preview**: Three.js-based sign preview
- **Job Management**: Live status updates via WebSocket
- **Responsive Design**: Tailwind CSS with accessibility features
- **Modern UX**: Clean, intuitive interface

## Rendering Pipeline

1. **Text Input** → Gemini API → Pose JSON
2. **Pose JSON** → Avatar Animation (Blender/WebGL)
3. **Frames** → FFmpeg → Final Video
4. **Storage** → Local/S3 → Download URL

## Development

### Running Tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Integration tests
python tests/test_integration.py
```

### Code Quality

```bash
# Backend linting
cd backend && black . && isort . && flake8

# Frontend linting
cd frontend && npm run lint
```

## Deployment

### Production Environment

1. Set up production environment variables
2. Configure Redis and storage backends
3. Set up monitoring and logging
4. Deploy with Docker Compose or Kubernetes

### Environment Variables

See `.env.example` for all available configuration options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please open an issue on GitHub.

=======
# SignSynth
>>>>>>> f726aa43695563fbe8c5eb0888db5045dfe1b632
