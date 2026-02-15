# MVP - AI Research & Planning

AI-powered research and product blueprint system inside VS Code. MVP uses Claude to research any topic in parallel, presenting findings as interconnected artifacts on an interactive canvas — then generates a structured product plan referencing those research findings.

## Features

- **AI Research** — Spawns parallel research agents that search the web and synthesize findings
- **Interactive Canvas** — View research artifacts and plan components on a React Flow canvas
- **Plan Generation** — AI suggests strategic directions and breaks them into actionable blueprints
- **Export Plans** — Export your product plan as a Markdown file directly into your workspace
- **Open in Browser** — Jump to the full web UI for a richer experience

## Getting Started

1. Open the **MVP** sidebar from the Activity Bar
2. Click **Sign In with GitHub** to authenticate
3. Create a new project and start researching

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `mvp.backendUrl` | `http://localhost:8000` | MVP backend API URL |
| `mvp.frontendUrl` | `http://localhost:5173` | MVP frontend web URL |
