-- Store GitHub project column order so the kanban board matches GitHub
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_column_order text[];