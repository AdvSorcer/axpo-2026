import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "axpo.db");
export const db = new Database(dbPath);

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
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id INTEGER,
      reporter_id INTEGER NOT NULL,
      start_date TEXT,
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users (id),
      FOREIGN KEY (reporter_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      attendees TEXT,
      summary TEXT,
      action_items TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT '備忘錄',
      pinned INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );
  `);

  // Migrate missing start_date column in existing issues table if needed
  try {
    const tableInfo = db.query("PRAGMA table_info(issues);").all() as any[];
    const hasStartDate = tableInfo.some((col: any) => col.name === "start_date");
    if (!hasStartDate) {
      db.exec("ALTER TABLE issues ADD COLUMN start_date TEXT;");
    }
  } catch (e) {
    // Ignore migration error
  }

  // Seed default admin and initial users if empty
  const userCount = db.query("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count === 0) {
    db.prepare(`
      INSERT INTO users (username, password_hash, name, email, role, avatar_url)
      VALUES 
      ('admin', 'admin123', '系統管理員 (Admin)', 'admin@axpo.io', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'),
      ('user', 'user123', '張小明 (John)', 'john@axpo.io', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'),
      ('alice', 'user123', '陳雅婷 (Alice)', 'alice@axpo.io', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice');
    `).run();
  }

  // Seed initial projects if empty
  const projectCount = db.query("SELECT COUNT(*) as count FROM projects").get() as any;
  if (projectCount.count === 0) {
    const admin = db.query("SELECT id FROM users WHERE username = 'admin'").get() as any;

    if (admin) {
      const p1 = db.prepare(`
        INSERT INTO projects (name, code, description, created_by)
        VALUES ('Axpo 2026 現代化專案管理平台', 'AXPO-2026', '打造高效能、具備甘特圖與即時狀態追蹤的專案管理系統', ?)
      `).run(admin.id);

      const p2 = db.prepare(`
        INSERT INTO projects (name, code, description, created_by)
        VALUES ('次世代 AI 智慧客服系統', 'AI-CHAT', '整合 LLM 與企業知識庫的智慧客服解決方案', ?)
      `).run(admin.id);

      // Add members
      const users = db.query("SELECT id FROM users").all() as any[];
      users.forEach(u => {
        db.prepare("INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(p1.lastInsertRowid, u.id, u.id === admin.id ? 'owner' : 'member');
        db.prepare("INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(p2.lastInsertRowid, u.id, u.id === admin.id ? 'owner' : 'member');
      });

      // Seed Issues with start_date & due_date
      const john = db.query("SELECT id FROM users WHERE username = 'user'").get() as any;
      const alice = db.query("SELECT id FROM users WHERE username = 'alice'").get() as any;
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const in5DaysStr = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

      if (john && alice) {
        db.prepare(`
          INSERT INTO issues (project_id, title, description, status, priority, assignee_id, reporter_id, start_date, due_date)
          VALUES 
          (?, '重構 JWT 身份驗證與 Token 管理', '提升系統安全性與輕量認證體驗', 'in_progress', 'urgent', ?, ?, ?, ?),
          (?, '優化月度甘特圖 Gantt Timeline 視圖', '提供更流暢的專案時程推演與日期對齊', 'todo', 'high', ?, ?, ?, ?),
          (?, '部署 Docker Compose 與 Nginx 反向代理', '容器化最佳實踐環境', 'done', 'medium', ?, ?, ?, ?);
        `).run(
          p1.lastInsertRowid, john.id, admin.id, todayStr, tomorrowStr,
          p1.lastInsertRowid, alice.id, admin.id, todayStr, in5DaysStr,
          p1.lastInsertRowid, john.id, admin.id, todayStr, todayStr
        );

        // Seed initial Notes for PM
        db.prepare(`
          INSERT INTO notes (project_id, title, content, category, pinned, created_by)
          VALUES
          (?, '📌 專案環境與測試數據說明', '測試環境 API 埠號為 3001，前端 Port 為 3000。管理者預設帳號為 admin / admin123。', '環境架構', 1, ?),
          (?, '💡 Q3 核心 Milestone 目標備忘', '1. 完成 Docker Compose 部署\n2. 增加 PM 隨手專案筆記功能\n3. 單元測試覆蓋率 100%', ' Milestone', 0, ?);
        `).run(p1.lastInsertRowid, admin.id, p1.lastInsertRowid, admin.id);
      }
    }
  }
}
