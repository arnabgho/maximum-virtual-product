# Maximum Virtual Product (MVP)

A unified visual blueprint system that combines AI-powered web research with product planning on an interactive canvas.

## What it does

1. **Research Phase**: Enter a topic (e.g., "project management tools for remote teams"). Multiple AI agents research different angles in parallel - competitors, trends, pain points - and present findings as interconnected artifact cards on a tldraw canvas.

2. **Plan Phase**: Describe your product. Claude breaks it into blueprint components that reference research findings by artifact ID, creating a comprehensive plan ready for implementation.

3. **Video Export**: Research findings can be exported as a narrated video via Remotion.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Supabase project
- Anthropic API key
- Brave Search API key

### Setup

```bash
# Backend
cd backend
pip install -e .
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Run the migration in your Supabase SQL editor:
```bash
# Copy contents of backend/migrations/001_initial.sql
```

Open http://localhost:5173

## Architecture

```
React 19 + tldraw v4 + Zustand
        │ REST + WebSocket
        ▼
FastAPI + Claude Opus 4.6
├── Parallel research sub-agents
│   ├── Brave Search API
│   └── httpx + readability
├── Plan breakdown service
└── Supabase persistence
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, tldraw v4, Zustand, Tailwind CSS v4 |
| Backend | FastAPI, Anthropic SDK, httpx |
| Search | Brave Search API |
| Database | Supabase (PostgreSQL) |
| Video | Remotion |
