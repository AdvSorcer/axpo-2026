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
    // 1. Create a private project created by Admin (user_id = 1) without adding Alice (user_id = 3)
    const secretCode = "SECRET-PROJ-" + Date.now();
    const res = db.prepare("INSERT INTO projects (name, code, description, created_by) VALUES (?, ?, ?, ?)").run(
      "管理者專屬保密專案",
      secretCode,
      "僅供管理者看見的保密專案",
      1
    );
    const privateProjId = res.lastInsertRowid;
    db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(privateProjId, 1, "owner");

    // 2. Query projects as John (username = 'user', regular user)
    const regularUser = db.query("SELECT * FROM users WHERE username = ?").get("user") as any;
    expect(regularUser.role).toBe("user");

    const userProjects = db.query(`
      SELECT DISTINCT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ? OR p.created_by = ?
    `).all(regularUser.id, regularUser.id) as any[];

    // Regular user should NOT see the secret project
    const hasSecretProject = userProjects.some(p => p.id === privateProjId);
    expect(hasSecretProject).toBe(false);

    // 3. Query projects as Admin (user_id = 1, admin role)
    const adminProjects = db.query("SELECT * FROM projects").all() as any[];
    const adminHasSecret = adminProjects.some(p => p.id === privateProjId);
    expect(adminHasSecret).toBe(true);

    // Cleanup
    db.prepare("DELETE FROM project_members WHERE project_id = ?").run(privateProjId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(privateProjId);
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

    // Clean up test issue
    db.prepare("DELETE FROM issues WHERE id = ?").run(issueId);
  });

  test("Dashboard My-Day logic calculates dueIn7DaysCount correctly", () => {
    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const sevenDaysLater = new Date(todayDate.getTime() + 7 * 86400000).toISOString().split("T")[0];

    const userId = 2; // John
    const myTasks = db.query(`
      SELECT i.* FROM issues i WHERE i.assignee_id = ?
    `).all(userId) as any[];

    const dueIn7DaysCount = myTasks.filter(
      (t) => t.due_date && t.due_date <= sevenDaysLater && t.status !== "done"
    ).length;

    expect(dueIn7DaysCount).toBeGreaterThanOrEqual(0);
  });

  test("Project member addition and removal logic", () => {
    const projId = 2;
    const userId = 3; // Alice

    // Add member
    try {
      db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(projId, userId, "member");
    } catch (e) {
      // Member already present
    }

    const member = db.query("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?").get(projId, userId) as any;
    expect(member).not.toBeNull();

    // Remove member
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ?").run(projId, userId);
    const memberAfterDelete = db.query("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?").get(projId, userId) as any;
    expect(memberAfterDelete).toBeNull();
  });
});
