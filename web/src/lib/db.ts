import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "db", "museum.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    _db.exec(schema);
  }
  return _db;
}

export interface Artifact {
  id: number;
  date: string;
  tag: string;
  commits: string;
  render_format: string;
  source_code: string;
  filename: string;
  title: string;
  reflection: string;
  aesthetic_used: string;
  release_name: string;
  stats: string;
  created_at: string;
}

export interface MemorySnapshot {
  id: number;
  artifact_id: number;
  memory_md: string;
  capacity_used_pct: number;
  entries_count: number;
}

export interface CreationDossier {
  id: number;
  artifact_id: number;
  commits_read: string;
  skills_invented: string;
  skills_used: string;
  references_pulled: string;
  process_notes: string;
  iterations: number;
}

export interface InventedSkill {
  id: number;
  name: string;
  created_on_date: string;
  category: string;
  content: string;
  description: string;
  download_count: number;
  first_used_on_artifact: number | null;
}

export function getAllArtifacts(): Artifact[] {
  return getDb()
    .prepare("SELECT * FROM artifacts ORDER BY date DESC")
    .all() as Artifact[];
}

export function getArtifactByDate(date: string): Artifact | undefined {
  return getDb()
    .prepare("SELECT * FROM artifacts WHERE date = ?")
    .get(date) as Artifact | undefined;
}

export function getMemorySnapshot(artifactId: number): MemorySnapshot | undefined {
  return getDb()
    .prepare("SELECT * FROM memory_snapshots WHERE artifact_id = ?")
    .get(artifactId) as MemorySnapshot | undefined;
}

export function getDossier(artifactId: number): CreationDossier | undefined {
  return getDb()
    .prepare("SELECT * FROM creation_dossiers WHERE artifact_id = ?")
    .get(artifactId) as CreationDossier | undefined;
}

export function getAllSkills(): InventedSkill[] {
  return getDb()
    .prepare("SELECT * FROM invented_skills ORDER BY created_on_date ASC")
    .all() as InventedSkill[];
}

export function getSkillByName(name: string): InventedSkill | undefined {
  return getDb()
    .prepare("SELECT * FROM invented_skills WHERE name = ?")
    .get(name) as InventedSkill | undefined;
}

export function getAllMemorySnapshots(): (MemorySnapshot & { date: string; tag: string })[] {
  return getDb()
    .prepare(`
      SELECT ms.*, a.date, a.tag
      FROM memory_snapshots ms
      JOIN artifacts a ON ms.artifact_id = a.id
      ORDER BY a.date ASC
    `)
    .all() as (MemorySnapshot & { date: string; tag: string })[];
}
