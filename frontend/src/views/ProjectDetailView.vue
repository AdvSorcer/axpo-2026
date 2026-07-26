<template>
  <div class="project-detail-page">
    <!-- Header Section (Ultra-Compact Navigation Tabs) -->
    <div class="project-header glass-card">
      <div class="tab-buttons">
        <n-button
          size="small"
          :type="activeTab === 'kanban' ? 'primary' : 'default'"
          secondary
          @click="activeTab = 'kanban'"
        >
          📌 議題看板
        </n-button>
        <n-button
          size="small"
          :type="activeTab === 'notes' ? 'primary' : 'default'"
          secondary
          @click="activeTab = 'notes'"
        >
          📝 專案筆記
        </n-button>
        <n-button
          size="small"
          :type="activeTab === 'files' ? 'primary' : 'default'"
          secondary
          @click="activeTab = 'files'"
        >
          📄 專案文件與檔案
        </n-button>
        <n-button
          v-if="!isAllProjects"
          size="small"
          :type="activeTab === 'meetings' ? 'primary' : 'default'"
          secondary
          @click="activeTab = 'meetings'"
        >
          🗣️ 會議記錄
        </n-button>
        <n-button
          v-if="!isAllProjects"
          size="small"
          :type="activeTab === 'info' ? 'primary' : 'default'"
          secondary
          @click="activeTab = 'info'"
        >
          ℹ️ 專案簡介與成員
        </n-button>
      </div>
    </div>

    <!-- TAB 1: KANBAN & LIST BOARD -->
    <div v-if="activeTab === 'kanban'" class="tab-content">
      <div class="tab-header-actions">
        <div class="actions-left">
          <div class="search-box">
            <n-input v-model:value="searchQuery" placeholder="搜尋議題標題..." clearable size="small" style="width: 240px;">
              <template #prefix>🔍</template>
            </n-input>
          </div>

          <!-- View Mode Switcher: Kanban vs List -->
          <div class="view-mode-toggle glass-card">
            <n-button
              size="tiny"
              :type="viewMode === 'kanban' ? 'primary' : 'default'"
              secondary
              @click="viewMode = 'kanban'"
            >
              📌 看板檢視
            </n-button>
            <n-button
              size="tiny"
              :type="viewMode === 'list' ? 'primary' : 'default'"
              secondary
              @click="viewMode = 'list'"
            >
              ☰ 列表檢視
            </n-button>
          </div>
        </div>

        <n-button v-if="!isAllProjects" type="primary" size="small" @click="showCreateIssueModal = true">
          ➕ 新增議題 Task
        </n-button>
      </div>

      <n-spin :show="loading">
        <!-- MODE A: KANBAN BOARD VIEW -->
        <div v-if="viewMode === 'kanban'" class="kanban-board">
          <!-- TODO Column -->
          <div
            class="kanban-column glass-card"
            @dragover.prevent
            @drop="onDropIssue('todo')"
          >
            <div class="column-header">
              <div class="column-title">
                <span class="status-dot todo"></span>
                <span>📋 待處理 (To-do)</span>
              </div>
              <n-tag size="tiny" round>{{ kanbanColumns.todo.length }}</n-tag>
            </div>
            <div class="column-cards">
              <div
                v-for="issue in kanbanColumns.todo"
                :key="issue.id"
                class="issue-card glass-card-hover"
                draggable="true"
                @dragstart="onDragStartIssue(issue)"
                @click="openEditIssueModal(issue)"
              >
                <div class="card-top">
                  <span class="card-id">#{{ issue.id }}</span>
                  <span class="priority-badge" :class="'badge-' + issue.priority">
                    {{ priorityText(issue.priority) }}
                  </span>
                </div>
                <div class="card-title">{{ issue.title }}</div>
                <div class="card-footer">
                  <span class="assignee-name">👤 {{ issue.assignee_name || '未指派' }}</span>
                  <span v-if="issue.due_date" class="due-badge">📅 {{ issue.due_date }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- IN PROGRESS Column -->
          <div
            class="kanban-column glass-card"
            @dragover.prevent
            @drop="onDropIssue('in_progress')"
          >
            <div class="column-header">
              <div class="column-title">
                <span class="status-dot in-progress"></span>
                <span>🚀 進行中 (In Progress)</span>
              </div>
              <n-tag size="tiny" round>{{ kanbanColumns.in_progress.length }}</n-tag>
            </div>
            <div class="column-cards">
              <div
                v-for="issue in kanbanColumns.in_progress"
                :key="issue.id"
                class="issue-card glass-card-hover"
                draggable="true"
                @dragstart="onDragStartIssue(issue)"
                @click="openEditIssueModal(issue)"
              >
                <div class="card-top">
                  <span class="card-id">#{{ issue.id }}</span>
                  <span class="priority-badge" :class="'badge-' + issue.priority">
                    {{ priorityText(issue.priority) }}
                  </span>
                </div>
                <div class="card-title">{{ issue.title }}</div>
                <div class="card-footer">
                  <span class="assignee-name">👤 {{ issue.assignee_name || '未指派' }}</span>
                  <span v-if="issue.due_date" class="due-badge">📅 {{ issue.due_date }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- REVIEW Column -->
          <div
            class="kanban-column glass-card"
            @dragover.prevent
            @drop="onDropIssue('review')"
          >
            <div class="column-header">
              <div class="column-title">
                <span class="status-dot review"></span>
                <span>🔍 審核中 (Review)</span>
              </div>
              <n-tag size="tiny" round>{{ kanbanColumns.review.length }}</n-tag>
            </div>
            <div class="column-cards">
              <div
                v-for="issue in kanbanColumns.review"
                :key="issue.id"
                class="issue-card glass-card-hover"
                draggable="true"
                @dragstart="onDragStartIssue(issue)"
                @click="openEditIssueModal(issue)"
              >
                <div class="card-top">
                  <span class="card-id">#{{ issue.id }}</span>
                  <span class="priority-badge" :class="'badge-' + issue.priority">
                    {{ priorityText(issue.priority) }}
                  </span>
                </div>
                <div class="card-title">{{ issue.title }}</div>
                <div class="card-footer">
                  <span class="assignee-name">👤 {{ issue.assignee_name || '未指派' }}</span>
                  <span v-if="issue.due_date" class="due-badge">📅 {{ issue.due_date }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- DONE Column -->
          <div
            class="kanban-column glass-card"
            @dragover.prevent
            @drop="onDropIssue('done')"
          >
            <div class="column-header">
              <div class="column-title">
                <span class="status-dot done"></span>
                <span>✅ 已完成 (Done)</span>
              </div>
              <n-tag size="tiny" round>{{ kanbanColumns.done.length }}</n-tag>
            </div>
            <div class="column-cards">
              <div
                v-for="issue in kanbanColumns.done"
                :key="issue.id"
                class="issue-card glass-card-hover done-card"
                draggable="true"
                @dragstart="onDragStartIssue(issue)"
                @click="openEditIssueModal(issue)"
              >
                <div class="card-top">
                  <span class="card-id">#{{ issue.id }}</span>
                  <span class="priority-badge" :class="'badge-' + issue.priority">
                    {{ priorityText(issue.priority) }}
                  </span>
                </div>
                <div class="card-title">{{ issue.title }}</div>
                <div class="card-footer">
                  <span class="assignee-name">👤 {{ issue.assignee_name || '未指派' }}</span>
                  <span v-if="issue.due_date" class="due-badge">📅 {{ issue.due_date }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MODE B: ISSUES LIST VIEW -->
        <div v-else class="issues-list-view glass-card">
          <div v-if="filteredIssuesList.length === 0" class="empty-files">
            📋 目前無符合條件的議題。
          </div>
          <div v-else class="list-table">
            <div class="table-header">
              <div class="col-id">#ID</div>
              <div class="col-title">議題標題與描述</div>
              <div class="col-status">狀態</div>
              <div class="col-priority">優先級</div>
              <div class="col-assignee">指派人員</div>
              <div class="col-dates">開始 / 結束日期</div>
              <div class="col-action">操作</div>
            </div>
            <div
              v-for="issue in filteredIssuesList"
              :key="issue.id"
              class="table-row glass-card-hover"
              @click="openEditIssueModal(issue)"
            >
              <div class="col-id">#{{ issue.id }}</div>
              <div class="col-title">
                <div class="issue-title-text" :class="{ strike: issue.status === 'done' }">
                  <span v-if="isAllProjects" class="project-tag">[{{ issue.project_code }}]</span>
                  {{ issue.title }}
                </div>
              </div>
              <div class="col-status" @click.stop>
                <n-select
                  size="tiny"
                  style="width: 120px;"
                  :options="statusOptions"
                  :value="issue.status"
                  @update:value="(val) => updateIssueStatusQuick(issue, val)"
                />
              </div>
              <div class="col-priority">
                <span class="priority-badge" :class="'badge-' + issue.priority">
                  {{ priorityText(issue.priority) }}
                </span>
              </div>
              <div class="col-assignee">
                👤 {{ issue.assignee_name || '未指派' }}
              </div>
              <div class="col-dates">
                <span>{{ issue.start_date || '-' }} ~ {{ issue.due_date || '-' }}</span>
              </div>
              <div class="col-action" @click.stop>
                <n-button size="tiny" secondary @click="openEditIssueModal(issue)">
                  ✏️ 編輯
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- TAB 2: PM PROJECT NOTES (MEMOS) -->
    <div v-if="activeTab === 'notes'" class="tab-content">
      <div class="notes-container glass-card">
        <div class="notes-header">
          <div class="header-left">
            <h2>📝 PM 專案隨手筆記 & 備忘錄</h2>
            <p class="sub-text">隨時記錄專案規格、環境帳號、技術決議與備忘草稿。</p>
          </div>
          <div class="header-right">
            <n-input v-model:value="noteSearchQuery" placeholder="搜尋筆記..." clearable size="small" style="width: 200px;">
              <template #prefix>🔍</template>
            </n-input>
            <n-button type="primary" size="small" @click="showCreateNoteModal = true">
              ➕ 新增筆記 Note
            </n-button>
          </div>
        </div>

        <n-spin :show="loadingNotes">
          <div v-if="filteredNotes.length === 0" class="empty-state">
            📝 目前尚無隨手筆記。點擊右上角「新增筆記 Note」來新增專案備忘錄！
          </div>

          <div v-else class="notes-grid">
            <div
              v-for="note in filteredNotes"
              :key="note.id"
              class="note-card glass-card-hover"
              :class="{ 'is-pinned': note.pinned }"
              @click="openEditNoteModal(note)"
            >
              <div class="note-card-top">
                <div class="note-category-row">
                  <span v-if="note.pinned" class="pin-badge">📌 置頂筆記</span>
                  <n-tag size="tiny" round :bordered="false">{{ note.category || '備忘錄' }}</n-tag>
                </div>
                <div class="note-actions" @click.stop>
                  <n-button size="tiny" circle secondary @click="togglePinNote(note)">
                    {{ note.pinned ? '📌' : '📍' }}
                  </n-button>
                  <n-button size="tiny" circle type="error" secondary @click="deleteNote(note)">
                    🗑️
                  </n-button>
                </div>
              </div>

              <h3 class="note-title">{{ note.title }}</h3>
              <p class="note-content">{{ note.content }}</p>

              <div class="note-footer">
                <span class="note-author">👤 {{ note.creator_name }}</span>
                <span class="note-time">⏰ {{ note.updated_at ? note.updated_at.split(' ')[0] : '2026-07-26' }}</span>
              </div>
            </div>
          </div>
        </n-spin>
      </div>
    </div>

    <!-- TAB 3: DIRECT FILES REPOSITORY -->
    <div v-if="activeTab === 'files'" class="tab-content">
      <div class="files-container glass-card">
        <div class="files-header">
          <div class="header-left">
            <h2>📄 專案文件與檔案</h2>
            <p class="sub-text">點擊上傳本機檔案、圖片或文件，隨時下載或存取。</p>
          </div>
          <n-upload
            :show-file-list="false"
            :custom-request="handleDirectFileUpload"
          >
            <n-button type="primary" size="small">
              📤 上傳新檔案
            </n-button>
          </n-upload>
        </div>

        <n-spin :show="loadingFiles">
          <div v-if="directFiles.length === 0" class="empty-files">
            📁 目前尚無上傳檔案，點擊右上角「上傳新檔案」即可上傳。
          </div>

          <div v-else class="file-grid">
            <div v-for="file in directFiles" :key="file.id" class="file-card glass-card-hover">
              <div class="file-icon">
                {{ getFileIcon(file.original_name) }}
              </div>
              <div class="file-info">
                <div class="file-name" :title="file.original_name">{{ file.original_name }}</div>
                <div class="file-meta">
                  <span>{{ formatFileSize(file.filesize) }}</span>
                  <span> • {{ file.uploader_name }}</span>
                  <span> • {{ file.uploaded_at.split(' ')[0] }}</span>
                </div>
              </div>
              <div class="file-actions">
                <n-button size="tiny" secondary @click="downloadFile(file)">
                  ⬇️ 下載
                </n-button>
                <n-button size="tiny" type="error" secondary @click="deleteFile(file)">
                  🗑️
                </n-button>
              </div>
            </div>
          </div>
        </n-spin>
      </div>
    </div>

    <!-- TAB 4: MEETINGS -->
    <div v-if="activeTab === 'meetings' && !isAllProjects" class="tab-content">
      <div class="meetings-container glass-card">
        <div class="meetings-header">
          <div>
            <h2>🗣️ 專案會議記錄</h2>
            <p class="sub-text">追蹤專案討論決議與各團隊成員的 Action Items 執行清單</p>
          </div>
          <n-button type="primary" size="small" @click="showCreateMeetingModal = true">
            ➕ 新增會議記錄
          </n-button>
        </div>

        <n-spin :show="loadingMeetings">
          <div v-if="meetings.length === 0" class="empty-state">
            🗣️ 目前尚無會議記錄。點擊右上角「新增會議記錄」按鈕新增！
          </div>

          <div v-else class="meetings-list">
            <div v-for="m in meetings" :key="m.id" class="meeting-card glass-card-hover">
              <div class="meeting-title-row">
                <h3>{{ m.title }}</h3>
                <span class="meeting-date">⏰ {{ m.date }}</span>
              </div>
              <p class="meeting-attendees">👥 出席人員: {{ m.attendees || '全體專案成員' }} (記錄者: {{ m.creator_name }})</p>
              
              <div class="meeting-body" v-if="m.summary">
                <div class="block-label">📝 會議重點摘要:</div>
                <p>{{ m.summary }}</p>
              </div>

              <div class="meeting-action-items" v-if="m.action_items">
                <div class="block-label">📌 Action Items 待辦任務:</div>
                <p>{{ m.action_items }}</p>
              </div>
            </div>
          </div>
        </n-spin>
      </div>
    </div>

    <!-- TAB 5: PROJECT OVERVIEW & MEMBER MANAGEMENT -->
    <div v-if="activeTab === 'info' && !isAllProjects" class="tab-content">
      <div class="info-layout">
        <!-- Project Description & Info -->
        <div class="info-card glass-card">
          <h2>📌 專案簡介與系統架構</h2>
          <div class="info-body">
            <p class="project-desc">{{ project?.description || '尚無設定專案詳細簡介。' }}</p>
            <div class="info-meta">
              <div class="meta-row">👑 專案建立者 (Owner): <strong>{{ project?.owner_name }}</strong></div>
              <div class="meta-row">📅 建立時間: <strong>{{ project?.created_at ? project.created_at.split(' ')[0] : '2026-07-25' }}</strong></div>
              <div class="meta-row">🏷️ 專案狀態: <n-tag size="small" type="success" round>進行中 (Active)</n-tag></div>
            </div>
          </div>
        </div>

        <!-- Project Members & Add/Remove -->
        <div class="info-card glass-card">
          <div class="members-header">
            <h2>👥 專案成員管理 ({{ project?.members?.length || 0 }} 人)</h2>
            <n-button v-if="authStore.isAdmin" type="primary" size="tiny" @click="showAddMemberModal = true">
              ➕ 新增專案成員
            </n-button>
          </div>
          <div class="member-grid">
            <div
              v-for="m in project?.members"
              :key="m.id"
              class="member-card glass-card-hover"
              @click="openUserEditModal(m)"
            >
              <img :src="m.avatar_url" class="member-avatar" />
              <div class="member-info">
                <div class="member-name">{{ m.name }}</div>
                <div class="member-email">{{ m.email }}</div>
                <div class="member-role">{{ m.user_role === 'admin' ? '👑 系統管理員' : '一般成員' }}</div>
              </div>
              <n-button
                v-if="authStore.isAdmin && m.user_id !== project.created_by"
                size="tiny"
                type="error"
                secondary
                @click.stop="handleRemoveMember(m.user_id)"
              >
                🗑️ 移出
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Note Modal -->
    <n-modal v-model:show="showCreateNoteModal" preset="card" title="📝 新增隨手筆記 Note" style="width: 520px;">
      <n-form :model="noteForm">
        <n-form-item label="筆記標題">
          <n-input v-model:value="noteForm.title" placeholder="例如：Q3 部署規格與測試環境 IP" />
        </n-form-item>
        <n-form-item label="筆記分類 (Category)">
          <n-select v-model:value="noteForm.category" :options="categoryOptions" tag placeholder="選擇或輸入新分類..." />
        </n-form-item>
        <n-form-item label="詳細內容">
          <n-input v-model:value="noteForm.content" type="textarea" :rows="6" placeholder="隨手記錄專案備忘錄、帳號規格或會議結論..." />
        </n-form-item>
        <n-form-item label="置頂設定">
          <n-checkbox v-model:checked="noteForm.pinned">📌 置頂此筆記</n-checkbox>
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showCreateNoteModal = false">取消</n-button>
          <n-button type="primary" :loading="submittingNote" @click="handleCreateNote">建立筆記</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Edit Note Modal -->
    <n-modal v-model:show="showEditNoteModal" preset="card" title="✏️ 編輯專案筆記 Note" style="width: 520px;">
      <n-form :model="editNoteForm" v-if="editNoteForm">
        <n-form-item label="筆記標題">
          <n-input v-model:value="editNoteForm.title" />
        </n-form-item>
        <n-form-item label="筆記分類 (Category)">
          <n-select v-model:value="editNoteForm.category" :options="categoryOptions" tag />
        </n-form-item>
        <n-form-item label="詳細內容">
          <n-input v-model:value="editNoteForm.content" type="textarea" :rows="7" />
        </n-form-item>
        <n-form-item label="置頂設定">
          <n-checkbox v-model:checked="editNoteForm.pinned">📌 置頂此筆記</n-checkbox>
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <n-button type="error" secondary @click="deleteNote(editNoteForm)">🗑️ 刪除筆記</n-button>
          <div style="display: flex; gap: 12px;">
            <n-button @click="showEditNoteModal = false">取消</n-button>
            <n-button type="primary" :loading="submittingNote" @click="handleSaveNote">儲存變更</n-button>
          </div>
        </div>
      </template>
    </n-modal>

    <!-- Create Meeting Modal -->
    <n-modal v-model:show="showCreateMeetingModal" preset="card" title="➕ 新增會議記錄" style="width: 540px;">
      <n-form :model="meetingForm">
        <n-form-item label="會議主題">
          <n-input v-model:value="meetingForm.title" placeholder="例如：Axpo 專案系統架構與 Docker 評審會議" />
        </n-form-item>
        <n-form-item label="會議時間">
          <n-date-picker v-model:formatted-value="meetingForm.date" value-format="yyyy-MM-dd HH:mm" type="datetime" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="出席人員">
          <n-input v-model:value="meetingForm.attendees" placeholder="張小明, 陳雅婷, 系統管理員..." />
        </n-form-item>
        <n-form-item label="會議重點摘要">
          <n-input v-model:value="meetingForm.summary" type="textarea" :rows="3" placeholder="記錄主要討論事項與結論..." />
        </n-form-item>
        <n-form-item label="📌 Action Items 待辦任務">
          <n-input v-model:value="meetingForm.action_items" type="textarea" :rows="3" placeholder="1. 張小明負責 JWT 測試 2. 陳雅婷撰寫 API 規範..." />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showCreateMeetingModal = false">取消</n-button>
          <n-button type="primary" :loading="submittingMeeting" @click="handleCreateMeeting">建立記錄</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Add Member Modal -->
    <n-modal v-model:show="showAddMemberModal" preset="card" title="➕ 新增專案成員" style="width: 460px;">
      <n-form>
        <n-form-item label="選擇使用者">
          <n-select v-model:value="selectedAddUserId" :options="availableUserOptions" placeholder="請選擇成員..." />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showAddMemberModal = false">取消</n-button>
          <n-button type="primary" :loading="submittingAddMember" @click="handleAddMemberSubmit">加入專案</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Create Issue Modal -->
    <n-modal v-model:show="showCreateIssueModal" preset="card" title="➕ 新增議題 Task" style="width: 540px;">
      <n-form :model="issueForm">
        <n-form-item label="議題標題">
          <n-input v-model:value="issueForm.title" placeholder="例如：重構 JWT 身份驗證" />
        </n-form-item>
        <n-form-item label="詳細描述">
          <n-input v-model:value="issueForm.description" type="textarea" :rows="3" placeholder="簡述任務重點與驗證標準..." />
        </n-form-item>
        <n-form-item label="優先級">
          <n-select v-model:value="issueForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="指派人員 (Assignee)">
          <n-select v-model:value="issueForm.assignee_id" :options="memberOptions" clearable />
        </n-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <n-form-item label="📅 開始日期 (Start Date)">
            <n-date-picker v-model:formatted-value="issueForm.start_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
          <n-form-item label="📅 結束/截止日期 (Due Date)">
            <n-date-picker v-model:formatted-value="issueForm.due_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
        </div>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showCreateIssueModal = false">取消</n-button>
          <n-button type="primary" :loading="submittingIssue" @click="handleCreateIssue">建立議題</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Edit Issue Modal -->
    <n-modal v-model:show="showEditIssueModal" preset="card" title="✏️ 編輯議題 Task" style="width: 540px;">
      <n-form :model="editIssueForm" v-if="editIssueForm">
        <n-form-item label="議題標題">
          <n-input v-model:value="editIssueForm.title" />
        </n-form-item>
        <n-form-item label="詳細描述">
          <n-input v-model:value="editIssueForm.description" type="textarea" :rows="4" />
        </n-form-item>
        <n-form-item label="看板狀態">
          <n-select v-model:value="editIssueForm.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="優先級">
          <n-select v-model:value="editIssueForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="指派人員 (Assignee)">
          <n-select v-model:value="editIssueForm.assignee_id" :options="memberOptions" clearable />
        </n-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <n-form-item label="📅 開始日期 (Start Date)">
            <n-date-picker v-model:formatted-value="editIssueForm.start_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
          <n-form-item label="📅 結束/截止日期 (Due Date)">
            <n-date-picker v-model:formatted-value="editIssueForm.due_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
        </div>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <n-button type="error" secondary @click="handleDeleteIssue">🗑️ 刪除議題</n-button>
          <div style="display: flex; gap: 12px;">
            <n-button @click="showEditIssueModal = false">取消</n-button>
            <n-button type="primary" :loading="submittingEditIssue" @click="handleSaveIssue">儲存變更</n-button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NTag,
  NButton,
  NInput,
  NSpin,
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NDatePicker,
  NCheckbox,
  NUpload,
  useMessage,
  UploadCustomRequestOptions
} from 'naive-ui'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useProjectStore } from '../stores/project'

const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const activeTab = ref<'kanban' | 'notes' | 'files' | 'meetings' | 'info'>('kanban')
const viewMode = ref<'kanban' | 'list'>('kanban')

const loading = ref(true)
const loadingNotes = ref(false)
const loadingFiles = ref(false)
const loadingMeetings = ref(false)
const searchQuery = ref('')
const noteSearchQuery = ref('')

const project = ref<any>(null)
const issues = ref<any[]>([])
const notes = ref<any[]>([])
const directFiles = ref<any[]>([])
const meetings = ref<any[]>([])
const allUsers = ref<any[]>([])
const draggedIssue = ref<any>(null)

const isAllProjects = computed(() => {
  return route.params.id === 'all' || route.params.id === '0'
})

// PM NOTES STATE & MODALS
const showCreateNoteModal = ref(false)
const showEditNoteModal = ref(false)
const submittingNote = ref(false)

const noteForm = ref({
  title: '',
  content: '',
  category: '備忘錄',
  pinned: false
})
const editNoteForm = ref<any>(null)

const categoryOptions = [
  { label: '備忘錄', value: '備忘錄' },
  { label: '環境架構', value: '環境架構' },
  { label: '規格需求', value: '規格需求' },
  { label: 'Milestone 目標', value: 'Milestone 目標' }
]

const filteredNotes = computed(() => {
  return notes.value.filter(n => {
    if (!noteSearchQuery.value) return true
    return n.title.toLowerCase().includes(noteSearchQuery.value.toLowerCase()) ||
           n.content.toLowerCase().includes(noteSearchQuery.value.toLowerCase()) ||
           (n.category && n.category.toLowerCase().includes(noteSearchQuery.value.toLowerCase()))
  })
})

async function loadNotes() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut) return
  loadingNotes.value = true
  try {
    const url = isAllProjects.value ? '/api/notes' : `/api/notes?project_id=${route.params.id}`
    const res = await axios.get(url)
    if (res.data.success) {
      notes.value = res.data.notes
    }
  } catch (err) {
    if (authStore.isAuthenticated && !authStore.isLoggingOut) {
      console.error(err)
    }
  } finally {
    loadingNotes.value = false
  }
}

async function handleCreateNote() {
  if (!noteForm.value.title || !noteForm.value.content) {
    message.warning('請填寫筆記標題與詳細內容')
    return
  }
  submittingNote.value = true
  try {
    const targetProjId = isAllProjects.value ? (projectStore.projects[0]?.id || 1) : Number(route.params.id)
    const res = await axios.post('/api/notes', {
      project_id: targetProjId,
      ...noteForm.value
    })
    if (res.data.success) {
      message.success('筆記已成功建立！')
      showCreateNoteModal.value = false
      noteForm.value = { title: '', content: '', category: '備忘錄', pinned: false }
      loadNotes()
    }
  } catch (err) {
    message.error('建立筆記失敗')
  } finally {
    submittingNote.value = false
  }
}

function openEditNoteModal(note: any) {
  editNoteForm.value = { ...note, pinned: Boolean(note.pinned) }
  showEditNoteModal.value = true
}

async function handleSaveNote() {
  if (!editNoteForm.value) return
  submittingNote.value = true
  try {
    const res = await axios.put(`/api/notes/${editNoteForm.value.id}`, editNoteForm.value)
    if (res.data.success) {
      message.success('筆記已更新！')
      showEditNoteModal.value = false
      loadNotes()
    }
  } catch (err) {
    message.error('更新筆記失敗')
  } finally {
    submittingNote.value = false
  }
}

async function togglePinNote(note: any) {
  try {
    const newPinned = !note.pinned
    const res = await axios.put(`/api/notes/${note.id}`, { pinned: newPinned })
    if (res.data.success) {
      note.pinned = newPinned ? 1 : 0
      message.success(newPinned ? '已置頂筆記' : '已取消置頂')
      loadNotes()
    }
  } catch (err) {
    message.error('操作失敗')
  }
}

async function deleteNote(note: any) {
  try {
    const res = await axios.delete(`/api/notes/${note.id}`)
    if (res.data.success) {
      message.success('筆記已刪除')
      showEditNoteModal.value = false
      loadNotes()
    }
  } catch (err) {
    message.error('刪除失敗')
  }
}

const showCreateIssueModal = ref(false)
const submittingIssue = ref(false)

const showCreateMeetingModal = ref(false)
const submittingMeeting = ref(false)
const meetingForm = ref({
  title: '',
  date: new Date().toISOString().split('T')[0] + ' 14:00',
  attendees: '',
  summary: '',
  action_items: ''
})

const showAddMemberModal = ref(false)
const selectedAddUserId = ref<number | null>(null)
const submittingAddMember = ref(false)

const availableUserOptions = computed(() => {
  if (!project.value || !project.value.members) return []
  const memberUserIds = new Set(project.value.members.map((m: any) => m.user_id))
  return allUsers.value
    .filter(u => !memberUserIds.has(u.id))
    .map(u => ({
      label: `${u.name} (${u.email})`,
      value: u.id
    }))
})

async function fetchAllUsers() {
  try {
    const res = await axios.get('/api/users')
    if (res.data.success) {
      allUsers.value = res.data.users
    }
  } catch (err) {
    console.error(err)
  }
}

function openUserEditModal(m: any) {}

async function updateIssueStatusQuick(issue: any, newStatus: string) {
  try {
    const res = await axios.put(`/api/issues/${issue.id}`, { status: newStatus })
    if (res.data.success) {
      issue.status = newStatus
      message.success('議題狀態已更新')
    }
  } catch (err) {
    message.error('更新失敗')
  }
}

async function handleCreateMeeting() {
  if (!meetingForm.value.title || !project.value) return
  submittingMeeting.value = true
  try {
    const res = await axios.post('/api/meetings', {
      project_id: project.value.id,
      ...meetingForm.value
    })
    if (res.data.success) {
      message.success('會議記錄已建立！')
      showCreateMeetingModal.value = false
      meetingForm.value = { title: '', date: new Date().toISOString().split('T')[0] + ' 14:00', attendees: '', summary: '', action_items: '' }
      loadMeetings()
    }
  } catch (err) {
    message.error('建立會議記錄失敗')
  } finally {
    submittingMeeting.value = false
  }
}

async function loadMeetings() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut || isAllProjects.value || !route.params.id) return
  loadingMeetings.value = true
  try {
    const res = await axios.get(`/api/meetings?project_id=${route.params.id}`)
    if (res.data.success) {
      meetings.value = res.data.meetings
    }
  } catch (err) {
    console.error(err)
  } finally {
    loadingMeetings.value = false
  }
}

async function handleAddMemberSubmit() {
  if (!selectedAddUserId.value || !project.value) return
  submittingAddMember.value = true
  try {
    const res = await axios.post(`/api/projects/${project.value.id}/members`, {
      user_id: selectedAddUserId.value,
      role: 'member'
    })
    if (res.data.success) {
      message.success('已新增專案成員！')
      showAddMemberModal.value = false
      selectedAddUserId.value = null
      loadProjectDetails()
    }
  } catch (err) {
    message.error('新增成員失敗')
  } finally {
    submittingAddMember.value = false
  }
}

async function handleRemoveMember(userId: number) {
  if (!project.value) return
  try {
    const res = await axios.delete(`/api/projects/${project.value.id}/members/${userId}`)
    if (res.data.success) {
      message.success('已將成員從專案移除')
      loadProjectDetails()
    }
  } catch (err) {
    message.error('移除失敗')
  }
}

const issueForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  assignee_id: null as number | null,
  start_date: null as string | null,
  due_date: null as string | null
})

const showEditIssueModal = ref(false)
const submittingEditIssue = ref(false)
const editIssueForm = ref<any>(null)

const priorityOptions = [
  { label: '🔥 緊急 (Urgent)', value: 'urgent' },
  { label: '高 (High)', value: 'high' },
  { label: '中 (Medium)', value: 'medium' },
  { label: '低 (Low)', value: 'low' }
]

const statusOptions = [
  { label: '📋 待處理 (To-do)', value: 'todo' },
  { label: '🚀 進行中 (In Progress)', value: 'in_progress' },
  { label: '🔍 審核中 (Review)', value: 'review' },
  { label: '✅ 已完成 (Done)', value: 'done' }
]

const memberOptions = computed(() => {
  if (!project.value || !project.value.members) return []
  return project.value.members.map((m: any) => ({
    label: `${m.name} (${m.username})`,
    value: m.user_id
  }))
})

function priorityText(p: string) {
  switch (p) {
    case 'urgent': return '🔥 緊急'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return p
  }
}

const filteredIssuesList = computed(() => {
  return issues.value.filter(i => {
    if (!searchQuery.value) return true
    return i.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
           (i.description && i.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
  })
})

const kanbanColumns = computed(() => {
  const filtered = filteredIssuesList.value

  return {
    todo: filtered.filter(i => i.status === 'todo'),
    in_progress: filtered.filter(i => i.status === 'in_progress'),
    review: filtered.filter(i => i.status === 'review'),
    done: filtered.filter(i => i.status === 'done')
  }
})

async function loadProjectDetails() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut) return
  loading.value = true
  try {
    if (isAllProjects.value) {
      project.value = null
      const issuesRes = await axios.get('/api/issues')
      if (issuesRes.data.success) {
        issues.value = issuesRes.data.issues
      }
      loadNotes()
      loadDirectFiles()
    } else {
      const projId = route.params.id
      const res = await axios.get(`/api/projects/${projId}`)
      if (res.data.success) {
        project.value = res.data.project
        projectStore.setCurrentProject(res.data.project)
      }

      const issuesRes = await axios.get(`/api/issues?project_id=${projId}`)
      if (issuesRes.data.success) {
        issues.value = issuesRes.data.issues
      }
      loadNotes()
      loadDirectFiles()
      loadMeetings()
    }
  } catch (err) {
    if (authStore.isAuthenticated && !authStore.isLoggingOut) {
      message.error('載入專案資料失敗')
    }
  } finally {
    loading.value = false
  }
}

async function loadDirectFiles() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut) return
  loadingFiles.value = true
  try {
    const url = isAllProjects.value ? '/api/files' : `/api/files?project_id=${route.params.id}`
    const res = await axios.get(url)
    if (res.data.success) {
      directFiles.value = res.data.files
    }
  } catch (err) {
    console.error(err)
  } finally {
    loadingFiles.value = false
  }
}

function onDragStartIssue(issue: any) {
  draggedIssue.value = issue
}

async function onDropIssue(targetStatus: string) {
  if (!draggedIssue.value) return
  const issue = draggedIssue.value
  if (issue.status === targetStatus) return

  issue.status = targetStatus
  try {
    await axios.put(`/api/issues/${issue.id}`, { status: targetStatus })
    message.success('已更新議題看板狀態')
  } catch (err) {
    message.error('更新狀態失敗')
  } finally {
    draggedIssue.value = null
  }
}

function openEditIssueModal(issue: any) {
  editIssueForm.value = { ...issue }
  showEditIssueModal.value = true
}

async function handleSaveIssue() {
  if (!editIssueForm.value) return
  submittingEditIssue.value = true
  try {
    const res = await axios.put(`/api/issues/${editIssueForm.value.id}`, editIssueForm.value)
    if (res.data.success) {
      message.success('議題更新成功')
      showEditIssueModal.value = false
      loadProjectDetails()
    }
  } catch (err) {
    message.error('更新議題失敗')
  } finally {
    submittingEditIssue.value = false
  }
}

async function handleDeleteIssue() {
  if (!editIssueForm.value) return
  try {
    const res = await axios.delete(`/api/issues/${editIssueForm.value.id}`)
    if (res.data.success) {
      message.success('議題已刪除')
      showEditIssueModal.value = false
      loadProjectDetails()
    }
  } catch (err) {
    message.error('刪除議題失敗')
  }
}

async function handleCreateIssue() {
  submittingIssue.value = true
  try {
    const res = await axios.post('/api/issues', {
      project_id: Number(route.params.id),
      ...issueForm.value
    })
    if (res.data.success) {
      message.success('議題建立成功')
      showCreateIssueModal.value = false
      issueForm.value = { title: '', description: '', priority: 'medium', assignee_id: null, start_date: null, due_date: null }
      loadProjectDetails()
    }
  } catch (err) {
    message.error('建立議題失敗')
  } finally {
    submittingIssue.value = false
  }
}

async function handleDirectFileUpload(options: UploadCustomRequestOptions) {
  const { file } = options
  if (!file.file) return
  const formData = new FormData()
  formData.append('file', file.file)
  formData.append('project_id', isAllProjects.value ? String(projectStore.projects[0]?.id || 1) : String(route.params.id))

  try {
    const res = await axios.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.success) {
      message.success('檔案上傳成功！')
      loadDirectFiles()
    }
  } catch (err) {
    message.error('檔案上傳失敗')
  }
}

async function downloadFile(file: any) {
  window.open(`/api/files/download/${file.id}`, '_blank')
}

async function deleteFile(file: any) {
  try {
    const res = await axios.delete(`/api/files/${file.id}`)
    if (res.data.success) {
      message.success('檔案已刪除')
      loadDirectFiles()
    }
  } catch (err) {
    message.error('刪除失敗')
  }
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext || '')) return '🖼️'
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return '📄'
  if (['zip', 'tar', 'gz', 'rar'].includes(ext || '')) return '📦'
  return '📁'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

watch(() => route.params.id, () => {
  loadProjectDetails()
})

onMounted(() => {
  loadProjectDetails()
  fetchAllUsers()
})
</script>

<style scoped>
.project-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-header {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-badge {
  font-weight: 800;
}

h1 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-main);
}

.tab-buttons {
  display: flex;
  gap: 8px;
}

/* KANBAN & LIST TAB CONTROLS */
.tab-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.actions-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
}

/* MODE A: KANBAN BOARD STYLING */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.kanban-column {
  padding: 16px;
  min-height: 580px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(161, 161, 170, 0.03);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 12px;
  font-weight: 700;
  font-size: 0.9rem;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.todo { background: #a1a1aa; }
.status-dot.in-progress { background: var(--text-main); }
.status-dot.review { background: var(--text-muted); }
.status-dot.done { background: #10b981; }

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.issue-card {
  padding: 14px 16px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: rgba(161, 161, 170, 0.05);
  transition: all 0.2s ease;
}

.issue-card:hover {
  border-color: var(--text-main);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-id {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.4;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.priority-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.assignee-name {
  font-weight: 600;
}

.due-badge {
  font-size: 0.72rem;
}

/* MODE B: ISSUES LIST VIEW TABLE STYLING */
.issues-list-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.list-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-glass);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
  background: rgba(161, 161, 170, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-row:hover {
  border-color: var(--text-main);
}

.col-id { width: 60px; font-weight: 800; font-size: 0.8rem; color: var(--text-muted); }
.col-title { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.issue-title-text { font-size: 0.92rem; font-weight: 700; color: var(--text-main); }
.issue-title-text.strike { text-decoration: line-through; color: var(--text-muted); }
.project-tag { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); margin-right: 6px; }
.issue-desc-sub { font-size: 0.78rem; color: var(--text-muted); }
.col-status { width: 140px; }
.col-priority { width: 100px; }
.col-assignee { width: 140px; font-size: 0.82rem; color: var(--text-main); font-weight: 600; }
.col-dates { width: 180px; font-size: 0.78rem; color: var(--text-muted); }
.col-action { width: 80px; text-align: right; }

/* TAB 2: PM NOTES STYLING */
.notes-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 16px;
}

.notes-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.note-card {
  padding: 18px;
  border-radius: 12px;
  border: 1px solid var(--border-glass);
  background: rgba(161, 161, 170, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.note-card.is-pinned {
  border-color: var(--text-main);
  background: rgba(161, 161, 170, 0.08);
}

.note-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.note-category-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pin-badge {
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef4444;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.3;
}

.note-content {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px dashed var(--border-glass);
  padding-top: 10px;
  margin-top: 4px;
}

/* FILES REPOSITORY STYLING */
.files-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 16px;
}

.files-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.sub-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.file-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--border-glass);
  border-radius: 10px;
  background: rgba(161, 161, 170, 0.03);
  transition: all 0.2s ease;
}

.file-card:hover {
  border-color: var(--text-main);
}

.file-icon {
  font-size: 1.8rem;
}

.file-info {
  flex: 1;
  overflow: hidden;
}

.file-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-actions {
  display: flex;
  gap: 6px;
}

.empty-files, .empty-state {
  padding: 40px 0;
  text-align: center;
  color: var(--text-muted);
}

/* MEETINGS STYLING */
.meetings-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.meetings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 16px;
}

.meetings-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meeting-card {
  padding: 20px;
  border: 1px solid var(--border-glass);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(161, 161, 170, 0.03);
}

.meeting-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meeting-title-row h3 {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.meeting-date {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.meeting-attendees {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 600;
}

.meeting-body, .meeting-action-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(161, 161, 170, 0.05);
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 3px solid var(--text-main);
  font-size: 0.85rem;
  line-height: 1.5;
}

.block-label {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.8rem;
}

/* INFO & MEMBER MANAGEMENT STYLING */
.info-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.info-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.info-card h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 12px;
}

.project-desc {
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.6;
}

.info-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-glass);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.members-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.member-card {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(161, 161, 170, 0.04);
}

.member-card:hover {
  border-color: var(--text-main);
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-glass);
}

.member-info {
  flex: 1;
  overflow: hidden;
}

.member-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
