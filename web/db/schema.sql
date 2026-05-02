CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  tag TEXT NOT NULL,
  commits TEXT NOT NULL DEFAULT '[]',
  render_format TEXT NOT NULL DEFAULT 'html',
  source_code TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  reflection TEXT NOT NULL DEFAULT '',
  aesthetic_used TEXT NOT NULL DEFAULT '[]',
  release_name TEXT NOT NULL DEFAULT '',
  stats TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id INTEGER UNIQUE REFERENCES artifacts(id) ON DELETE CASCADE,
  memory_md TEXT NOT NULL,
  capacity_used_pct INTEGER DEFAULT 0,
  entries_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS creation_dossiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id INTEGER UNIQUE REFERENCES artifacts(id) ON DELETE CASCADE,
  commits_read TEXT NOT NULL DEFAULT '[]',
  skills_invented TEXT NOT NULL DEFAULT '[]',
  skills_used TEXT NOT NULL DEFAULT '[]',
  references_pulled TEXT NOT NULL DEFAULT '[]',
  process_notes TEXT NOT NULL DEFAULT '',
  iterations INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invented_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_on_date TEXT NOT NULL,
  category TEXT DEFAULT 'render',
  content TEXT NOT NULL,
  description TEXT DEFAULT '',
  download_count INTEGER DEFAULT 0,
  first_used_on_artifact INTEGER REFERENCES artifacts(id),
  created_at TEXT DEFAULT (datetime('now'))
);
