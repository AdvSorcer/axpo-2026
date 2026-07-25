import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { db, initDatabase } from "./db";
import path from "path";
import fs from "fs";

// Initialize Database & Seed
initDatabase();

const JWT_SECRET = process.env.JWT_SECRET || "axpo-secret-2026-key";
const uploadsDir = path.join(process.cwd(), "uploads");

const app = new Elysia()
  .use(cors({
    origin: true,
    credentials: true,
  }))
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
      exp: "7d",
    })
  )

  // Auth Middleware Helper
  .derive(async ({ jwt, headers }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null };
    }
    const token = authHeader.substring(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.id) {
      return { user: null };
    }
    
    const user = db.query("SELECT id, username, name, email, role, avatar_url FROM users WHERE id = ?").get(payload.id as number) as any;
    return { user };
  })

  // ----------------------------------------------------
  // AUTH ROUTES
  // ----------------------------------------------------
  .group("/api/auth", (app) =>
    app
      .post(
        "/login",
        async ({ body, jwt, set }) => {
          const { username, password } = body;
          const user = db
            .query("SELECT * FROM users WHERE username = ?")
            .get(username) as any;

          if (!user || user.password_hash !== password) {
            set.status = 401;
            return { success: false, message: "帳號或密碼不正確" };
          }

          const token = await jwt.sign({
            id: user.id,
            username: user.username,
            role: user.role,
          });

          return {
            success: true,
            token,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
              avatar_url: user.avatar_url,
            },
          };
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String(),
          }),
        }
      )

      .get("/me", ({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "未登入或 Token 已失效" };
        }
        return { success: true, user };
      })
  )

  // ----------------------------------------------------
  // DASHBOARD ROUTE ("用戶登入會關心他今天需要做什麼")
  // ----------------------------------------------------
  .get("/api/dashboard/my-day", ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: "Unauthorized" };
    }

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const sevenDaysLater = new Date(todayDate.getTime() + 7 * 86400000).toISOString().split("T")[0];

    const myTasks = db
      .query(`
        SELECT i.*, p.name as project_name, p.code as project_code 
        FROM issues i
        JOIN projects p ON i.project_id = p.id
        WHERE i.assignee_id = ?
        ORDER BY 
          CASE WHEN i.due_date = ? THEN 0 ELSE 1 END,
          CASE i.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          i.updated_at DESC
      `)
      .all(user.id, today) as any[];

    const urgentCount = myTasks.filter((t) => t.priority === "urgent" && t.status !== "done").length;
    const dueIn7DaysCount = myTasks.filter(
      (t) => t.due_date && t.due_date <= sevenDaysLater && t.status !== "done"
    ).length;
    const completedCount = myTasks.filter((t) => t.status === "done").length;

    return {
      success: true,
      data: {
        user,
        stats: {
          totalAssigned: myTasks.length,
          urgentCount,
          dueIn7DaysCount,
          completedCount,
        },
        myTasks,
      },
    };
  })

  // ----------------------------------------------------
  // PROJECTS & MEMBERS MANAGEMENT ROUTES (RBAC ISOLATION)
  // ----------------------------------------------------
  .group("/api/projects", (app) =>
    app
      .get("/", ({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }

        let sql = "";
        let params: any[] = [];

        // Admin sees all projects; Regular users only see projects they are members or owner of
        if (user.role === "admin") {
          sql = `
            SELECT p.*, u.name as owner_name,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.id) as issue_count,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'done') as completed_issue_count,
            (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            JOIN users u ON p.created_by = u.id
            ORDER BY p.created_at DESC
          `;
        } else {
          sql = `
            SELECT DISTINCT p.*, u.name as owner_name,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.id) as issue_count,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'done') as completed_issue_count,
            (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            JOIN users u ON p.created_by = u.id
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ? OR p.created_by = ?
            ORDER BY p.created_at DESC
          `;
          params = [user.id, user.id];
        }

        const projects = db.query(sql).all(...params) as any[];
        return { success: true, projects };
      })

      .post(
        "/",
        ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          if (user.role !== "admin") {
            set.status = 403;
            return { success: false, message: "權限不足，僅系統管理員可建立新專案" };
          }

          const { name, code, description } = body;
          try {
            const res = db
              .prepare(
                "INSERT INTO projects (name, code, description, created_by) VALUES (?, ?, ?, ?)"
              )
              .run(name, code.toUpperCase(), description || "", user.id);

            const projectId = res.lastInsertRowid;
            db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(
              projectId,
              user.id,
              "owner"
            );

            return { success: true, id: projectId, message: "專案建立成功" };
          } catch (err: any) {
            set.status = 400;
            return { success: false, message: err.message || "建立專案失敗（專案代碼可能重複）" };
          }
        },
        {
          body: t.Object({
            name: t.String(),
            code: t.String(),
            description: t.Optional(t.String()),
          }),
        }
      )

      .get("/:id", ({ params, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        const project = db
          .query(`
            SELECT p.*, u.name as owner_name 
            FROM projects p 
            JOIN users u ON p.created_by = u.id 
            WHERE p.id = ?
          `)
          .get(params.id) as any;

        if (!project) {
          set.status = 404;
          return { success: false, message: "專案不存在" };
        }

        const members = db
          .query(`
            SELECT pm.*, u.username, u.name, u.email, u.avatar_url, u.role as user_role
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
          `)
          .all(params.id) as any[];

        return { success: true, project: { ...project, members } };
      })

      .post(
        "/:id/members",
        ({ params, body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          if (user.role !== "admin") {
            set.status = 403;
            return { success: false, message: "僅管理員可以管理專案成員" };
          }

          const { user_id, role } = body;
          try {
            db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(
              params.id,
              user_id,
              role || "member"
            );
            return { success: true, message: "已將成員新增至專案" };
          } catch (err: any) {
            set.status = 400;
            return { success: false, message: "該成員已在專案中" };
          }
        },
        {
          body: t.Object({
            user_id: t.Number(),
            role: t.Optional(t.String()),
          }),
        }
      )

      .delete("/:id/members/:userId", ({ params, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        if (user.role !== "admin") {
          set.status = 403;
          return { success: false, message: "僅管理員可以移除專案成員" };
        }

        db.prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ?").run(
          params.id,
          params.userId
        );
        return { success: true, message: "已將成員從專案中移除" };
      })
  )

  // ----------------------------------------------------
  // ISSUES (TASKS) ROUTES WITH START_DATE SUPPORT
  // ----------------------------------------------------
  .group("/api/issues", (app) =>
    app
      .get("/", ({ query, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }

        const projectId = query.project_id;
        let sql = `
          SELECT i.*, 
                 p.name as project_name, p.code as project_code,
                 u_assignee.name as assignee_name, u_assignee.avatar_url as assignee_avatar,
                 u_reporter.name as reporter_name
          FROM issues i
          JOIN projects p ON i.project_id = p.id
          LEFT JOIN users u_assignee ON i.assignee_id = u_assignee.id
          JOIN users u_reporter ON i.reporter_id = u_reporter.id
        `;
        const paramsArray: any[] = [];

        if (projectId) {
          sql += " WHERE i.project_id = ?";
          paramsArray.push(projectId);
        }

        sql += " ORDER BY i.created_at DESC";

        const issues = db.query(sql).all(...paramsArray) as any[];
        return { success: true, issues };
      })

      .post(
        "/",
        ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          const { project_id, title, description, status, priority, assignee_id, start_date, due_date } = body;

          const todayStr = new Date().toISOString().split('T')[0];

          const res = db
            .prepare(`
              INSERT INTO issues (project_id, title, description, status, priority, assignee_id, reporter_id, start_date, due_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              project_id,
              title,
              description || "",
              status || "todo",
              priority || "medium",
              assignee_id || null,
              user.id,
              start_date || todayStr,
              due_date || null
            );

          return { success: true, id: res.lastInsertRowid, message: "議題建立成功" };
        },
        {
          body: t.Object({
            project_id: t.Number(),
            title: t.String(),
            description: t.Optional(t.String()),
            status: t.Optional(t.String()),
            priority: t.Optional(t.String()),
            assignee_id: t.Optional(t.Nullable(t.Number())),
            start_date: t.Optional(t.Nullable(t.String())),
            due_date: t.Optional(t.Nullable(t.String())),
          }),
        }
      )

      .put(
        "/:id",
        ({ params, body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          const issue = db.query("SELECT * FROM issues WHERE id = ?").get(params.id) as any;
          if (!issue) {
            set.status = 404;
            return { success: false, message: "議題不存在" };
          }

          const title = body.title !== undefined ? body.title : issue.title;
          const description = body.description !== undefined ? body.description : issue.description;
          const status = body.status !== undefined ? body.status : issue.status;
          const priority = body.priority !== undefined ? body.priority : issue.priority;
          const assignee_id = body.assignee_id !== undefined ? body.assignee_id : issue.assignee_id;
          const start_date = body.start_date !== undefined ? body.start_date : issue.start_date;
          const due_date = body.due_date !== undefined ? body.due_date : issue.due_date;

          db.prepare(`
            UPDATE issues 
            SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, start_date = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(title, description, status, priority, assignee_id, start_date, due_date, params.id);

          return { success: true, message: "議題更新成功" };
        },
        {
          body: t.Object({
            title: t.Optional(t.String()),
            description: t.Optional(t.String()),
            status: t.Optional(t.String()),
            priority: t.Optional(t.String()),
            assignee_id: t.Optional(t.Nullable(t.Number())),
            start_date: t.Optional(t.Nullable(t.String())),
            due_date: t.Optional(t.Nullable(t.String())),
          }),
        }
      )

      .delete("/:id", ({ params, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        db.prepare("DELETE FROM issues WHERE id = ?").run(params.id);
        return { success: true, message: "議題刪除成功" };
      })
  )

  // ----------------------------------------------------
  // MEETINGS ROUTES
  // ----------------------------------------------------
  .group("/api/meetings", (app) =>
    app
      .get("/", ({ query, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        const projectId = query.project_id;
        let sql = `
          SELECT m.*, p.name as project_name, u.name as creator_name
          FROM meetings m
          JOIN projects p ON m.project_id = p.id
          JOIN users u ON m.created_by = u.id
        `;
        const params: any[] = [];
        if (projectId) {
          sql += " WHERE m.project_id = ?";
          params.push(projectId);
        }
        sql += " ORDER BY m.date DESC";

        const meetings = db.query(sql).all(...params) as any[];
        return { success: true, meetings };
      })

      .post(
        "/",
        ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          const { project_id, title, date, attendees, summary, action_items } = body;
          const res = db
            .prepare(`
              INSERT INTO meetings (project_id, title, date, attendees, summary, action_items, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(project_id, title, date, attendees || "", summary || "", action_items || "", user.id);

          return { success: true, id: res.lastInsertRowid, message: "會議記錄建立成功" };
        },
        {
          body: t.Object({
            project_id: t.Number(),
            title: t.String(),
            date: t.String(),
            attendees: t.Optional(t.String()),
            summary: t.Optional(t.String()),
            action_items: t.Optional(t.String()),
          }),
        }
      )
  )

  // ----------------------------------------------------
  // DIRECT FILE UPLOAD & MANAGEMENT ROUTES
  // ----------------------------------------------------
  .group("/api/files", (app) =>
    app
      .get("/", ({ query, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        const projectId = query.project_id;
        let sql = `
          SELECT a.*, p.name as project_name, u.name as uploader_name
          FROM attachments a
          JOIN projects p ON a.project_id = p.id
          JOIN users u ON a.uploaded_by = u.id
        `;
        const params: any[] = [];
        if (projectId) {
          sql += " WHERE a.project_id = ?";
          params.push(projectId);
        }
        sql += " ORDER BY a.uploaded_at DESC";

        const files = db.query(sql).all(...params) as any[];
        return { success: true, files };
      })

      .post("/upload", async ({ body, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }

        const file = (body as any).file as File;
        const project_id = Number((body as any).project_id);

        if (!file || !project_id) {
          set.status = 400;
          return { success: false, message: "請選擇上傳檔案與專案 ID" };
        }

        const ext = path.extname(file.name);
        const storedFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
        const savePath = path.join(uploadsDir, storedFilename);

        const arrayBuffer = await file.arrayBuffer();
        fs.writeFileSync(savePath, Buffer.from(arrayBuffer));

        const res = db
          .prepare(`
            INSERT INTO attachments (project_id, filename, original_name, filepath, filesize, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(project_id, storedFilename, file.name, savePath, file.size, user.id);

        return {
          success: true,
          id: res.lastInsertRowid,
          original_name: file.name,
          filesize: file.size,
          message: "檔案上傳成功",
        };
      })

      .get("/download/:id", ({ params, set }) => {
        const attachment = db.query("SELECT * FROM attachments WHERE id = ?").get(params.id) as any;
        if (!attachment || !fs.existsSync(attachment.filepath)) {
          set.status = 404;
          return "檔案不存在";
        }

        set.headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(attachment.original_name)}"`;
        return Bun.file(attachment.filepath);
      })

      .delete("/:id", ({ params, user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        const file = db.query("SELECT * FROM attachments WHERE id = ?").get(params.id) as any;
        if (file) {
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
          db.prepare("DELETE FROM attachments WHERE id = ?").run(params.id);
        }
        return { success: true, message: "檔案已刪除" };
      })
  )

  // ----------------------------------------------------
  // USERS MANAGEMENT ROUTES (ADMIN & USER EDITING)
  // ----------------------------------------------------
  .group("/api/users", (app) =>
    app
      .get("/", ({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { success: false, message: "Unauthorized" };
        }
        const users = db.query("SELECT id, username, name, email, role, avatar_url, created_at FROM users").all() as any[];
        return { success: true, users };
      })

      .post(
        "/",
        ({ body, user, set }) => {
          if (!user || user.role !== "admin") {
            set.status = 403;
            return { success: false, message: "權限不足，僅管理員可建立帳號" };
          }
          const { username, password, name, email, role } = body;
          try {
            const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
            const res = db
              .prepare("INSERT INTO users (username, password_hash, name, email, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)")
              .run(username, password, name, email, role || "user", avatar_url);

            return { success: true, id: res.lastInsertRowid, message: "使用者建立成功" };
          } catch (err: any) {
            set.status = 400;
            return { success: false, message: "建立失敗，用戶名稱可能重複" };
          }
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String(),
            name: t.String(),
            email: t.String(),
            role: t.Optional(t.String()),
          }),
        }
      )

      .put(
        "/:id",
        ({ params, body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          if (user.role !== "admin" && user.id !== Number(params.id)) {
            set.status = 403;
            return { success: false, message: "權限不足，僅管理員或本人可修改成員資料" };
          }

          const existing = db.query("SELECT * FROM users WHERE id = ?").get(params.id) as any;
          if (!existing) {
            set.status = 404;
            return { success: false, message: "使用者不存在" };
          }

          const name = body.name !== undefined ? body.name : existing.name;
          const email = body.email !== undefined ? body.email : existing.email;
          const role = (user.role === "admin" && body.role !== undefined) ? body.role : existing.role;
          const password_hash = body.password ? body.password : existing.password_hash;

          db.prepare("UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?").run(
            name,
            email,
            role,
            password_hash,
            params.id
          );

          return { success: true, message: "成員資料更新成功" };
        },
        {
          body: t.Object({
            name: t.Optional(t.String()),
            email: t.Optional(t.String()),
            role: t.Optional(t.String()),
            password: t.Optional(t.String()),
          }),
        }
      )
  )

  .listen(3001);

console.log(`🚀 Axpo ElysiaJS Backend is running at http://${app.server?.hostname}:${app.server?.port}`);
