<template>
  <div class="fullpage-timeline">
    <!-- Standalone Full-Page Header -->
    <header class="timeline-top-bar glass-card">
      <div class="top-bar-left">
        <n-button size="small" secondary @click="goBackHome">
          ⬅️ 返回主頁
        </n-button>
        <div class="brand-title">
          <span class="icon">📅</span>
          <span class="title-text">專案甘特時程圖 (Timeline)</span>
        </div>
      </div>

      <div class="top-bar-right">
        <!-- Month Navigator -->
        <div class="month-navigator glass-card">
          <n-button size="tiny" secondary @click="prevMonth">◀ 上一個月</n-button>
          <span class="current-month-text">🗓️ {{ currentYear }} 年 {{ currentMonth + 1 }} 月</span>
          <n-button size="tiny" secondary @click="nextMonth">下一個月 ▶</n-button>
          <n-button size="tiny" type="primary" secondary @click="goToday">今天</n-button>
        </div>

        <!-- Single Unified Project Selector -->
        <div class="filter-group">
          <span class="filter-label">選擇專案:</span>
          <n-select
            v-model:value="selectedProjectId"
            size="small"
            style="width: 380px;"
            :options="projectSelectOptions"
            clearable
            placeholder="全選 (所有專案)"
          />
        </div>

        <div class="filter-group">
          <span class="filter-label">狀態:</span>
          <n-select
            v-model:value="selectedStatus"
            size="small"
            style="width: 130px;"
            :options="statusFilterOptions"
            clearable
            placeholder="全部狀態"
          />
        </div>
      </div>
    </header>

    <!-- Full-Width Timeline Body -->
    <div class="timeline-main-content">
      <n-spin :show="loading">
        <div class="gantt-container glass-card">
          <!-- Date Header Axis (Entire Month: 28 ~ 31 Days) -->
          <div class="gantt-header-row">
            <div class="gantt-label-col">議題 / Task 名稱</div>
            <div class="gantt-days-grid" :style="{ gridTemplateColumns: `repeat(${daysInMonthCount}, 1fr)` }">
              <div
                v-for="day in dateColumns"
                :key="day.dateStr"
                class="day-cell-header"
                :class="{ 'is-today': day.dateStr === todayStr }"
              >
                <div class="day-name">{{ day.dayOfWeek }}</div>
                <div class="day-num">{{ day.dayNum }}</div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredIssues.length === 0" class="empty-gantt">
            📅 本月份目前無相符的議題時程。點擊右上角切換月份或重置篩選！
          </div>

          <!-- Gantt Task Rows + Today Marker Line -->
          <div v-else class="gantt-body">
            <!-- TODAY VERTICAL MARKER LINE (Gantt Vertical Baseline) -->
            <div
              v-if="todayIndexInMonth !== -1"
              class="today-marker-line"
              :style="todayLineStyle"
            >
              <div class="today-marker-tag">TODAY</div>
            </div>

            <div
              v-for="issue in filteredIssues"
              :key="issue.id"
              class="gantt-row glass-card-hover"
              @click="openEditTaskModal(issue)"
            >
              <!-- Left Info Column -->
              <div class="gantt-label-col">
                <div class="task-info">
                  <span class="project-code">[{{ issue.project_code }}]</span>
                  <span class="task-name" :class="{ strike: issue.status === 'done' }">
                    {{ issue.title }}
                  </span>
                </div>
              </div>

              <!-- Right Timeline Grid & Start/Due Bar -->
              <div class="gantt-days-grid" :style="{ gridTemplateColumns: `repeat(${daysInMonthCount}, 1fr)` }">
                <!-- Background Grid Lines -->
                <div
                  v-for="day in dateColumns"
                  :key="day.dateStr"
                  class="day-grid-line"
                  :class="{ 'is-today': day.dateStr === todayStr }"
                ></div>

                <!-- Interactive Task Timeline Bar for Current Month -->
                <div
                  v-if="isIssueVisibleInMonth(issue)"
                  class="gantt-bar-wrapper"
                  :style="calcBarStyle(issue)"
                  :title="`${issue.title} (${getIssueStartDate(issue)} ~ ${getIssueEndDate(issue)})`"
                >
                  <div
                    class="gantt-bar"
                    :class="[issue.status, 'p-' + issue.priority]"
                  >
                    <span class="bar-title">{{ issue.title }}</span>
                    <span class="bar-date">
                      📅 {{ formatDateSpan(getIssueStartDate(issue), getIssueEndDate(issue)) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- Edit Task Modal with Assignee Select -->
    <n-modal v-model:show="showEditModal" preset="card" title="✏️ 編輯議題與甘特圖時程" style="width: 560px;">
      <n-form :model="editForm" v-if="editForm">
        <n-form-item label="議題標題">
          <n-input v-model:value="editForm.title" />
        </n-form-item>
        <n-form-item label="詳細描述">
          <n-input v-model:value="editForm.description" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="👤 指派給人員 (Assignee)">
          <n-select v-model:value="editForm.assignee_id" :options="userSelectOptions" clearable placeholder="選擇負責人..." />
        </n-form-item>
        <n-form-item label="看板狀態 (Status)">
          <n-select v-model:value="editForm.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="優先級 (Priority)">
          <n-select v-model:value="editForm.priority" :options="priorityOptions" />
        </n-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <n-form-item label="📅 開始日期 (Start Date)">
            <n-date-picker v-model:formatted-value="editForm.start_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
          <n-form-item label="📅 結束/截止日期 (Due Date)">
            <n-date-picker v-model:formatted-value="editForm.due_date" value-format="yyyy-MM-dd" type="date" clearable style="width: 100%;" />
          </n-form-item>
        </div>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <n-button type="error" secondary @click="handleDeleteTask">🗑️ 刪除任務</n-button>
          <div style="display: flex; gap: 12px;">
            <n-button @click="showEditModal = false">取消</n-button>
            <n-button type="primary" :loading="submittingEdit" @click="handleSaveTask">儲存變更</n-button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NSpin, NSelect, NModal, NForm, NFormItem, NInput, NDatePicker, NButton, useMessage } from 'naive-ui'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useProjectStore } from '../stores/project'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const loading = ref(true)
const issues = ref<any[]>([])
const allUsers = ref<any[]>([])
const selectedProjectId = ref<number | null>(0)
const selectedStatus = ref<string | null>(null)

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentDate = ref(new Date())
const todayStr = getLocalDateString()

function goBackHome() {
  router.push('/')
}

const userSelectOptions = computed(() => {
  return allUsers.value.map(u => ({
    label: `${u.name} (@${u.username})`,
    value: u.id
  }))
})

async function fetchUsers() {
  try {
    const res = await axios.get('/api/users')
    if (res.data.success) {
      allUsers.value = res.data.users
    }
  } catch (err) {
    console.error(err)
  }
}

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function goToday() {
  currentDate.value = new Date()
}

// Safely extract YYYY-MM-DD from any date or datetime string
function extractDateOnly(str?: string): string {
  if (!str) return ''
  return str.slice(0, 10)
}

function getIssueStartDate(issue: any): string {
  if (issue.start_date) return extractDateOnly(issue.start_date)
  if (issue.due_date) return extractDateOnly(issue.due_date)
  if (issue.created_at) return extractDateOnly(issue.created_at)
  return todayStr
}

function getIssueEndDate(issue: any): string {
  if (issue.due_date) return extractDateOnly(issue.due_date)
  return getIssueStartDate(issue)
}

// Generate all days for the currently selected month
const dateColumns = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六']

  const list = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const yearStr = dateObj.getFullYear()
    const mStr = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const dateStr = `${yearStr}-${mStr}-${dStr}`

    list.push({
      dateStr,
      dayNum: d,
      dayOfWeek: daysOfWeek[dateObj.getDay()]
    })
  }
  return list
})

const daysInMonthCount = computed(() => dateColumns.value.length)

// Calculate today index in the current displayed month
const todayIndexInMonth = computed(() => {
  return dateColumns.value.findIndex(d => d.dateStr === todayStr)
})

// Calculate exact CSS position for the Today vertical line
const todayLineStyle = computed(() => {
  const index = todayIndexInMonth.value
  const total = daysInMonthCount.value
  if (index === -1 || total === 0) return { display: 'none' }

  const cellPercent = 100 / total
  const centerPercent = (index + 0.5) * cellPercent

  return {
    left: `calc(320px + (100% - 320px) * ${centerPercent / 100})`
  }
})

const projectSelectOptions = computed(() => {
  const options = [
    { label: '🌐 所有專案 (All Projects)', value: 0 }
  ]
  projectStore.projects.forEach(p => {
    options.push({
      label: `[${p.code}] ${p.name}`,
      value: p.id
    })
  })
  return options
})

const statusFilterOptions = [
  { label: '待處理 (To-do)', value: 'todo' },
  { label: '進行中 (In Progress)', value: 'in_progress' },
  { label: '審核中 (Review)', value: 'review' },
  { label: '已完成 (Done)', value: 'done' }
]

const statusOptions = [
  { label: '📋 待處理 (To-do)', value: 'todo' },
  { label: '🚀 進行中 (In Progress)', value: 'in_progress' },
  { label: '🔍 審核中 (Review)', value: 'review' },
  { label: '✅ 已完成 (Done)', value: 'done' }
]

const priorityOptions = [
  { label: '🔥 緊急 (Urgent)', value: 'urgent' },
  { label: '高 (High)', value: 'high' },
  { label: '中 (Medium)', value: 'medium' },
  { label: '低 (Low)', value: 'low' }
]

const filteredIssues = computed(() => {
  return issues.value.filter(issue => {
    if (selectedProjectId.value && selectedProjectId.value !== 0 && issue.project_id !== selectedProjectId.value) return false
    if (selectedStatus.value && issue.status !== selectedStatus.value) return false
    return true
  })
})

function isIssueVisibleInMonth(issue: any) {
  const days = dateColumns.value
  if (days.length === 0) return false
  const monthStart = days[0].dateStr
  const monthEnd = days[days.length - 1].dateStr

  const issueStart = getIssueStartDate(issue)
  const issueEnd = getIssueEndDate(issue)

  return issueStart <= monthEnd && issueEnd >= monthStart
}

function priorityText(p: string) {
  switch (p) {
    case 'urgent': return '🔥 緊急'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return p
  }
}

function formatDateSpan(start?: string, due?: string) {
  if (start && due && start !== due) return `${start.slice(5)} ~ ${due.slice(5)}`
  if (due) return `${due.slice(5)}`
  if (start) return `${start.slice(5)}`
  return '進行中'
}

function calcBarStyle(issue: any) {
  const days = dateColumns.value
  const totalDays = days.length
  if (totalDays === 0) return { left: '0%', width: '0%' }

  const monthStart = days[0].dateStr
  const monthEnd = days[totalDays - 1].dateStr

  const issueStart = getIssueStartDate(issue)
  const issueEnd = getIssueEndDate(issue)

  let startIndex = days.findIndex(d => d.dateStr === issueStart)
  let endIndex = days.findIndex(d => d.dateStr === issueEnd)

  if (startIndex === -1) {
    if (issueStart < monthStart) startIndex = 0
    else startIndex = totalDays - 1
  }
  if (endIndex === -1) {
    if (issueEnd > monthEnd) endIndex = totalDays - 1
    else endIndex = startIndex
  }
  if (endIndex < startIndex) endIndex = startIndex

  const leftPercent = (startIndex / totalDays) * 100
  const widthPercent = Math.max(((endIndex - startIndex + 1) / totalDays) * 100, (1 / totalDays) * 100)

  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`
  }
}

const showEditModal = ref(false)
const submittingEdit = ref(false)
const editForm = ref<any>(null)

async function fetchIssues() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut) return
  loading.value = true
  try {
    const res = await axios.get('/api/issues')
    if (res.data.success) {
      issues.value = res.data.issues
    }
  } catch (err) {
    if (authStore.isAuthenticated && !authStore.isLoggingOut) {
      message.error('載入議題時程失敗')
    }
  } finally {
    loading.value = false
  }
}

function openEditTaskModal(issue: any) {
  editForm.value = { ...issue }
  showEditModal.value = true
}

async function handleSaveTask() {
  if (!editForm.value) return
  submittingEdit.value = true
  try {
    const res = await axios.put(`/api/issues/${editForm.value.id}`, editForm.value)
    if (res.data.success) {
      message.success('任務時程與資料已更新！')
      showEditModal.value = false
      fetchIssues()
    }
  } catch (err) {
    message.error('更新失敗')
  } finally {
    submittingEdit.value = false
  }
}

async function handleDeleteTask() {
  if (!editForm.value) return
  try {
    const res = await axios.delete(`/api/issues/${editForm.value.id}`)
    if (res.data.success) {
      message.success('議題已刪除')
      showEditModal.value = false
      fetchIssues()
    }
  } catch (err) {
    message.error('刪除失敗')
  }
}

onMounted(() => {
  fetchIssues()
  fetchUsers()
  projectStore.fetchProjects()
})
</script>

<style scoped>
.fullpage-timeline {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark-base);
  padding: 16px 24px 32px 24px;
  box-sizing: border-box;
  gap: 20px;
}

/* Standalone Full-Page Header Top Bar */
.timeline-top-bar {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.month-navigator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  border-radius: 8px;
}

.current-month-text {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-main);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.timeline-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Monthly Gantt Chart Styling */
.gantt-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  min-height: calc(100vh - 130px);
}

.gantt-header-row {
  display: flex;
  align-items: center;
  border-bottom: 2px solid var(--border-glass);
  padding-bottom: 14px;
  font-weight: 700;
}

.gantt-label-col {
  width: 320px;
  min-width: 320px;
  padding-right: 16px;
  font-size: 0.9rem;
  color: var(--text-main);
}

.gantt-days-grid {
  flex: 1;
  display: grid;
  position: relative;
  min-width: 900px;
}

.day-cell-header {
  text-align: center;
  padding: 4px 0;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.day-cell-header.is-today {
  background: rgba(161, 161, 170, 0.25);
  color: var(--text-main);
  font-weight: 800;
}

.day-num {
  font-size: 0.85rem;
  font-weight: 700;
}

.empty-gantt {
  padding: 60px 0;
  text-align: center;
  color: var(--text-muted);
}

.gantt-body {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* TODAY VERTICAL MARKER LINE STYLING */
.today-marker-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.today-marker-tag {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #ef4444;
  color: #ffffff;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.gantt-row {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-glass);
  cursor: pointer;
  transition: background 0.2s;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.project-code {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
}

.task-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-name.strike {
  text-decoration: line-through;
  color: var(--text-muted);
}

.day-grid-line {
  border-right: 1px dashed var(--border-glass);
  height: 100%;
}
.day-grid-line.is-today {
  background: rgba(239, 68, 68, 0.04);
}

/* Gantt Bar Wrapper for Month Grid */
.gantt-bar-wrapper {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 28px;
  padding: 0 2px;
  z-index: 2;
  transition: all 0.2s ease;
}

.gantt-bar {
  height: 100%;
  border-radius: 6px;
  background: var(--text-main);
  color: var(--bg-dark-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-glass);
  overflow: hidden;
  white-space: nowrap;
}

.gantt-bar.done {
  opacity: 0.5;
  background: var(--text-muted);
  text-decoration: line-through;
}

.gantt-bar.p-urgent {
  border: 1.5px solid var(--text-main);
}

.bar-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-date {
  font-size: 0.7rem;
  opacity: 0.85;
  margin-left: 6px;
}
</style>
