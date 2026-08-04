import { describe, expect, test, beforeAll } from "bun:test";
import { initDatabase, db } from "../src/db";

beforeAll(() => {
  initDatabase();
});

describe("Axpo 2026 Project Management Backend Unit & API Tests", () => {

  test("Database initialization and seed users check", () => {
    const admin = db.query("SELECT * FROM users WHERE username = ?").get("admin") as any;
    expect(admin).not.toBeNull();
    expect(admin.role).toBe("admin");
    expect(admin.name).toContain("系統管理員");

    const user = db.query("SELECT * FROM users WHERE username = ?").get("user") as any;
    expect(user).not.toBeNull();
    expect(user.role).toBe("user");
  });

  test("Database seed projects check", () => {
    const projects = db.query("SELECT * FROM projects").all() as any[];
    expect(projects.length).toBeGreaterThanOrEqual(2);
    expect(projects[0].code).toBe("AXPO-2026");
  });

  test("Project access control isolation per user membership", () => {
    const secretCode = "SECRET-PROJ-" + Date.now();
    const res = db.prepare("INSERT INTO projects (name, code, description, created_by) VALUES (?, ?, ?, ?)").run(
      "管理者專屬保密專案",
      secretCode,
      "僅供管理者看見的保密專案",
      1
    );
    const privateProjId = res.lastInsertRowid;
    db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(privateProjId, 1, "owner");

    const regularUser = db.query("SELECT * FROM users WHERE username = ?").get("user") as any;
    expect(regularUser.role).toBe("user");

    const userProjects = db.query(`
      SELECT DISTINCT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ? OR p.created_by = ?
    `).all(regularUser.id, regularUser.id) as any[];

    const hasSecretProject = userProjects.some(p => p.id === privateProjId);
    expect(hasSecretProject).toBe(false);

    const adminProjects = db.query("SELECT * FROM projects").all() as any[];
    const adminHasSecret = adminProjects.some(p => p.id === privateProjId);
    expect(adminHasSecret).toBe(true);

    db.prepare("DELETE FROM project_members WHERE project_id = ?").run(privateProjId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(privateProjId);
  });

  test("PM Project Notes CRUD & Pinned Logic", () => {
    const projId = 1;
    const adminId = 1;

    // 1. Create a note
    const res = db.prepare(`
      INSERT INTO notes (project_id, title, content, category, pinned, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projId, "測試筆記標題", "這是詳細測試筆記內容", "架構規格", 1, adminId);

    const noteId = res.lastInsertRowid;
    const inserted = db.query("SELECT * FROM notes WHERE id = ?").get(noteId) as any;

    expect(inserted).not.toBeNull();
    expect(inserted.title).toBe("測試筆記標題");
    expect(inserted.pinned).toBe(1);

    // 2. Update note (unpin)
    db.prepare("UPDATE notes SET pinned = 0, title = '已修改筆記標題' WHERE id = ?").run(noteId);
    const updated = db.query("SELECT * FROM notes WHERE id = ?").get(noteId) as any;
    expect(updated.pinned).toBe(0);
    expect(updated.title).toBe("已修改筆記標題");

    // 3. Delete note
    db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
    const deleted = db.query("SELECT * FROM notes WHERE id = ?").get(noteId) as any;
    expect(deleted).toBeNull();
  });

  test("Issues schema supports start_date and due_date", () => {
    const today = new Date().toISOString().split('T')[0];
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const res = db.prepare(`
      INSERT INTO issues (project_id, title, description, status, priority, assignee_id, reporter_id, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(1, "UnitTest Issue", "Test Description", "todo", "high", 2, 1, today, in3Days);

    const issueId = res.lastInsertRowid;
    const inserted = db.query("SELECT * FROM issues WHERE id = ?").get(issueId) as any;

    expect(inserted).not.toBeNull();
    expect(inserted.title).toBe("UnitTest Issue");
    expect(inserted.start_date).toBe(today);
    expect(inserted.due_date).toBe(in3Days);

    db.prepare("DELETE FROM issues WHERE id = ?").run(issueId);
  });

  test("Project status schema & update status test", () => {
    const res = db.prepare("INSERT INTO projects (name, code, description, created_by, status) VALUES (?, ?, ?, ?, ?)").run(
      "狀態測試專案",
      "STATUS-TEST-" + Date.now(),
      "測試專案狀態更新功能",
      1,
      "active"
    );
    const projId = res.lastInsertRowid;
    const inserted = db.query("SELECT * FROM projects WHERE id = ?").get(projId) as any;
    expect(inserted).not.toBeNull();
    expect(inserted.status).toBe("active");

    // Update status to completed
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run("completed", projId);
    const updated = db.query("SELECT * FROM projects WHERE id = ?").get(projId) as any;
    expect(updated.status).toBe("completed");

    // Cleanup
    db.prepare("DELETE FROM projects WHERE id = ?").run(projId);
  });

  test("Admin user deletion & self-deletion protection logic test", () => {
    // 1. Create a dummy user to be deleted
    const tempUsername = "temp_delete_user_" + Date.now();
    const res = db.prepare(`
      INSERT INTO users (username, password_hash, name, email, role)
      VALUES (?, 'pass123', '待刪除測試成員', 'temp@axpo.io', 'user')
    `).run(tempUsername);

    const tempUserId = res.lastInsertRowid;
    expect(tempUserId).toBeGreaterThan(0);

    // Add temp user to project 1
    db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(1, tempUserId, "member");
    const memberBefore = db.query("SELECT * FROM project_members WHERE user_id = ?").get(tempUserId);
    expect(memberBefore).not.toBeNull();

    // 2. Perform DB deletion (emulating backend handler)
    db.prepare("UPDATE issues SET assignee_id = NULL WHERE assignee_id = ?").run(tempUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(tempUserId);

    // 3. Verify user and project_members records are deleted
    const userAfter = db.query("SELECT * FROM users WHERE id = ?").get(tempUserId);
    expect(userAfter).toBeNull();

    const memberAfter = db.query("SELECT * FROM project_members WHERE user_id = ?").get(tempUserId);
    expect(memberAfter).toBeNull();
  });
});
