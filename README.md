# Maximum Virtual Product (MVP)

A unified visual blueprint system that combines AI-powered web research with product planning on an interactive canvas.

## What it does

1. **Onboarding**: Name your topic, describe what you want to build, then answer AI-generated clarifying questions to refine the research scope.

2. **Research Phase**: Multiple AI agents research different angles in parallel — competitors, trends, pain points — using Claude's built-in web search. Findings stream in real-time as interconnected artifact cards on a React Flow canvas, complete with AI-generated images.

3. **Plan Directions**: After research, Claude suggests 2–3 strategic approaches. Pick one (or provide your own) to guide the plan.

4. **Plan Phase**: Claude breaks your product into blueprint components that reference research findings by artifact ID, with Mermaid architecture diagrams. Review the plan and request feedback or regeneration on any section.

5. **Video Export**: Research findings can be exported as a narrated video via Remotion, including Mermaid diagram rendering.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Supabase project
- Anthropic API key
- Google Gemini API key (for image generation)

### Environment Variables

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for storage uploads) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (image generation) |


### Setup

```bash
# Backend
cd backend
pip install -e .
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Video export (optional, new terminal)
cd video
npm install
npx remotion studio
```

### Database

Run the migrations in your Supabase SQL editor:
- `backend/migrations/001_initial.sql`
- `backend/migrations/002_add_image_url.sql`

Open http://localhost:5173

## Architecture

```
React 19 + React Flow + Zustand
        │ REST + WebSocket
        ▼
FastAPI + Claude Opus 4.6
├── Parallel research sub-agents
│   └── Claude built-in web search
├── Image generation (Google Gemini)
├── Plan breakdown service
├── Mermaid diagram generation
└── Supabase persistence + storage
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Flow (@xyflow/react), Zustand, Tailwind CSS v4 |
| Animations | Framer Motion |
| Diagrams | Mermaid, dagre (DAG layout) |
| Markdown | react-markdown, remark-gfm |
| Backend | FastAPI, Anthropic SDK, httpx, readability-lxml |
| AI | Claude Opus 4.6 (research + planning), Google Gemini (image generation) |
| Search | Claude built-in web search (`web_search_20250305`) |
| Database | Supabase (PostgreSQL + Storage) |
| Video | Remotion |
