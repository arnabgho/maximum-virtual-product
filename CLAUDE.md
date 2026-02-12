# Maximum Virtual Product (MVP)

## Project Overview
AI-powered research and product blueprint system. Multi-phase flow:
1. **Onboarding** - Name topic, describe what to build, answer clarifying questions
2. **Research Phase** - Parallel AI agents research a topic via Claude's built-in web search, presenting findings as interconnected artifacts on a React Flow canvas
3. **Plan Directions** - AI suggests 2-3 strategic approaches based on research
4. **Plan Phase** - Claude breaks down a product/project into blueprint components, referencing research artifacts by ID

## Architecture
- **Backend**: Python FastAPI + Anthropic SDK (Claude Opus 4.6) + Google Gemini (images) + Supabase
- **Frontend**: React 19 + Vite + React Flow (@xyflow/react) + Zustand + Tailwind CSS v4 + Framer Motion
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
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for storage uploads)
- `GEMINI_API_KEY` - Google Gemini API key (image generation)
- `BRAVE_API_KEY` - Legacy, not used in current research flow

## Key Patterns
- Every artifact has a short copyable ID (e.g., `art_7kx9`) for cross-phase referencing
- Research spawns parallel sub-agents (3-5) that each use Claude's built-in web search tool
- All events stream via WebSocket to the frontend in real-time
- React Flow custom nodes: `ArtifactNode` and `GroupNode` with dagre auto-layout
- Mermaid diagrams rendered in plan artifacts

## Database
Run migrations in your Supabase SQL editor:
- `backend/migrations/001_initial.sql`
- `backend/migrations/002_add_image_url.sql`

## Important Files
- `backend/app/services/research_service.py` - Research orchestration pipeline
- `backend/app/services/claude_service.py` - Claude API wrapper with extended thinking
- `backend/app/agents/research_agent.py` - Individual research sub-agent
- `frontend/src/components/canvas/ProjectCanvas.tsx` - React Flow canvas integration
- `frontend/src/stores/projectStore.ts` - Central Zustand state
