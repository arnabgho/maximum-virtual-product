-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    phase TEXT DEFAULT 'research' CHECK (phase IN ('research', 'plan')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('research', 'plan')),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    source_url TEXT,
    importance INTEGER DEFAULT 50,
    group_id TEXT,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    "references" TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Artifact connections table
CREATE TABLE IF NOT EXISTS artifact_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    from_artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
    to_artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
    label TEXT DEFAULT '',
    connection_type TEXT DEFAULT 'related'
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('research', 'plan')),
    title TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    width FLOAT DEFAULT 800,
    height FLOAT DEFAULT 600
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'human' CHECK (source IN ('human', 'ai')),
    author TEXT DEFAULT '',
    comment TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'addressed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_phase ON artifacts(phase);
CREATE INDEX IF NOT EXISTS idx_artifact_connections_project_id ON artifact_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_groups_project_id ON groups(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_artifact_id ON feedback(artifact_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
