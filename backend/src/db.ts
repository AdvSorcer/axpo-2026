import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "axpo.sqlite");
export const db = new Database(dbPath);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Enable WAL mode for better concurrency performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'completed'
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo', -- 'todo' | 'in_progress' | 'review' | 'done'
      priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
      assignee_id INTEGER,
      reporter_id INTEGER NOT NULL,
      start_date TEXT,
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(assignee_id) REFERENCES users(id),
      FOREIGN KEY(reporter_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD HH:mm
      attendees TEXT, -- Comma separated or string
      summary TEXT,
      action_items TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      document_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );
  `);

  // Ensure start_date column exists if migrating existing DB
  try {
    db.exec("ALTER TABLE issues ADD COLUMN start_date TEXT;");
  } catch (e) {
    // Column already exists
  }

  // Check if seed data is needed
  const userCount = db.query("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  console.log("🌱 Seeding initial database records...");

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, email, role, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run("admin", "admin123", "系統管理員 (Admin)", "admin@axpo.io", "admin", "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin");
  insertUser.run("user", "user123", "張小明 (John)", "john@axpo.io", "user", "https://api.dicebear.com/7.x/avataaars/svg?seed=John");
  insertUser.run("alice", "user123", "陳雅婷 (Alice)", "alice@axpo.io", "user", "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice");

  // Insert Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (name, code, description, status, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  const p1 = insertProject.run("Axpo 2026 現代化專案管理平台", "AXPO-2026", "全新世代極速、直覺且全功能之企業級專案協作平台", "active", 1);
  const p2 = insertProject.run("雲端架構微服務重構", "CLOUD-MIG", "改善系統高併發效能與自動化 K8s 部署流程", "active", 1);

  // Insert Members
  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `);

  insertMember.run(p1.lastInsertRowid, 1, "owner");
  insertMember.run(p1.lastInsertRowid, 2, "member");
  insertMember.run(p1.lastInsertRowid, 3, "member");

  insertMember.run(p2.lastInsertRowid, 1, "owner");
  insertMember.run(p2.lastInsertRowid, 2, "member");

  // Insert Issues (Tasks) with start_date & due_date
  const insertIssue = db.prepare(`
    INSERT INTO issues (project_id, title, description, status, priority, assignee_id, reporter_id, start_date, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIssue.run(p1.lastInsertRowid, "【今日緊急】修正 JWT Token 權限中繼站驗證錯誤", "當普通使用者嘗試存取管理介面時應返回 403 HTTP 狀態碼而非 500 錯誤", "in_progress", "urgent", 2, 1, yesterday, today);
  insertIssue.run(p1.lastInsertRowid, "實現專案甘特圖與開始/結束時間設定", "支援開始日期與結束日期的排程甘特圖跨度顯示", "todo", "high", 2, 1, today, in3Days);
  insertIssue.run(p1.lastInsertRowid, "優化 Vue 3 現代化單色極簡 CSS 主題", "採用 Naive UI 加上黑白經典極簡調色盤", "done", "medium", 2, 1, yesterday, today);
  
  insertIssue.run(p1.lastInsertRowid, "撰寫 API 文件與 TypeBox Schema 檢驗規則", "定義全站 Auth, Project, Issue, Meeting, Document 接口規範", "review", "medium", 3, 1, today, tomorrow);
  insertIssue.run(p2.lastInsertRowid, "【今日到期】設定 Docker Compose 多容器編排環境", "整合 Bun 後端服務與 Vite 前端單頁應用容器化部署", "in_progress", "high", 2, 1, yesterday, today);

  console.log("✅ Seed data inserted successfully!");
}
