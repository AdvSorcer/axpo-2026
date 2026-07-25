# 🚀 Axpo 2026 現代化專案管理平台 (Project Management Platform)

Axpo 2026 是一款極致流暢、現代深色/極簡白風格的輕量化專案管理系統。支援看板模式、列表檢視、全月甘特時程圖、會議記錄、檔案總覽與權限管理。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端 (Frontend)**: Vue 3 (Composition API) + Vite + Naive UI + Pinia + Vue Router
- **後端 (Backend)**: Bun + ElysiaJS + SQLite (bun:sqlite) + JWT Auth
---

## 🐳 使用 Docker Compose 

```bash
# 啟動全站服務 (前端 Port 3000, 後端 Port 3001)
docker compose up -d --build
```

開啟瀏覽器存取：
- **前端介面**: [http://localhost:3000](http://localhost:3000)
- **後端 API**: [http://localhost:3001](http://localhost:3001)

停止 Docker 服務：
```bash
docker compose down
```

---

## 🔑 預設測試登入帳號

| 角色 | 帳號 (Username) | 預設密碼 (Password) | 說明 |
| :--- | :--- | :--- | :--- |
| **👑 系統管理員** | `admin` | `admin123` | 全站最高權限、專案與成員管理 |
| **👤 一般成員** | `user` | `user123` | 張小明 |
| **👤 一般成員** | `alice` | `user123` | 陳雅婷 |

---

## 💻 本機開發模式 (Local Development)

若您要在本機進行開發，請使用 [Bun](https://bun.sh)：

### 1. 啟動後端
```bash
cd backend
bun install
bun run dev
```

### 2. 啟動前端
```bash
cd frontend
bun install
bun run dev
```

### 3. 執行單元測試 (Unit Tests)
```bash
# 後端單元與 API 測試
cd backend && bun test

# 前端甘特圖時程邏輯單元測試
cd frontend && bun test
```

---

## 📄 授權條款 (License)
MIT License
