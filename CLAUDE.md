# Maximum Virtual Product (MVP)

## Project Overview
AI-powered research and product blueprint system. Two-phase flow:
1. **Research Phase** - Parallel AI agents research a topic via web search, presenting findings as interconnected artifacts on a tldraw canvas
2. **Plan Phase** - Claude breaks down a product/project into blueprint components, referencing research artifacts by ID

## Architecture
- **Backend**: Python FastAPI + Anthropic SDK (Claude Opus 4.6) + Supabase
- **Frontend**: React 19 + Vite + tldraw v4 + Zustand + Tailwind CSS v4
- **Video**: Remotion for exporting research findings as video

## Running Locally

### Backend
```bash
cd backend
pip install -e .
# Copy .env.example to .env and fill in keys
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Video (optional)
```bash
cd video
npm install
npx remotion studio
```

## Environment Variables
- `ANTHROPIC_API_KEY` - Claude Opus 4.6 API key
- `BRAVE_API_KEY` - Brave Search API key for web research
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/service role key

## Key Patterns
- Every artifact has a short copyable ID (e.g., `art_7kx9`) for cross-phase referencing
- Research spawns parallel sub-agents (3-5) that each search + fetch + summarize
- All events stream via WebSocket to the frontend in real-time
- tldraw custom shapes: `ArtifactShapeUtil` and `GroupShapeUtil`

## Database
Run `backend/migrations/001_initial.sql` in your Supabase SQL editor to create tables.

## Important Files
- `backend/app/services/research_service.py` - Research orchestration pipeline
- `backend/app/services/claude_service.py` - Claude API wrapper with extended thinking
- `backend/app/agents/research_agent.py` - Individual research sub-agent
- `frontend/src/components/canvas/ProjectCanvas.tsx` - tldraw canvas integration
- `frontend/src/stores/projectStore.ts` - Central Zustand state
