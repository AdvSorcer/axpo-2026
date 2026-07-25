---
description: "專案技術堆棧 (Vue 3, Naive UI, ElysiaJS, Bun, SQLite, Docker) 與開發規範 (KISS, TypeBox, Vue Router, Bun CLI)"
globs: "*"
---

# 專案技術堆棧與開發規範 (Project Rules)

## 🛠 技術堆棧 (Tech Stack)

### Frontend
- **Framework & Tools**: Vue 3 + Vite + TypeScript
- **UI Component Library**: Naive UI
- **Routing**: Vue Router

### Backend
- **Framework**: ElysiaJS
- **Runtime & Package Manager**: Bun
- **Database**: SQLite (使用內建原生驅動 `bun:sqlite`)

### Deployment & Containerization
- **Container**: Docker Compose

---

## 📐 開發指導 (Development Guidelines)

1. **遵循 KISS 原則 (Keep It Simple, Stupid)**
   - 保持設計與程式碼簡潔明瞭，避免過度設計（Over-engineering）。
   - 模組與函式應專注於單一職責。

2. **遵循 ElysiaJS 最佳實踐**
   - 善用 **TypeBox** 進行 HTTP request / response 的 Schema 定義與型態檢查。
   - 確保 API 具備端到端 (End-to-End) 的強型態安全。

3. **前端路由管理**
   - 統一使用 **Vue Router** 管理前端頁面的路由與導覽狀態。

4. **Bun 環境與命令規範**
   - 統一採用 **Bun** 作為套件管理工具與 JavaScript/TypeScript 執行環境。
   - **套件安裝**：`bun install` (或 `bun add <package>`)
   - **執行測試**：`bun test`
   - **專案打包**：`bun build`
