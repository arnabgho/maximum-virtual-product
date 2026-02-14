-- Add user_id column to projects for per-user filtering (Supabase Auth)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
