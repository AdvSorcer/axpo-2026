<template>
  <div class="dashboard-page">
    <!-- Clickable Filter Stats Cards Grid -->
    <div class="stats-grid">
      <div
        class="stat-card glass-card glass-card-hover"
        :class="{ 'active-card': activeFilter === 'urgent' }"
        @click="activeFilter = 'urgent'"
      >
        <div class="stat-icon urgent">🔥</div>
        <div class="stat-data">
          <div class="stat-value">{{ stats.urgentCount }}</div>
          <div class="stat-label">緊急急件 (Urgent)</div>
        </div>
      </div>

      <div
        class="stat-card glass-card glass-card-hover"
        :class="{ 'active-card': activeFilter === 'due7' }"
        @click="activeFilter = 'due7'"
      >
        <div class="stat-icon due">⏰</div>
        <div class="stat-data">
          <div class="stat-value">{{ stats.dueIn7DaysCount }}</div>
          <div class="stat-label">七天內截止 (Due in 7 Days)</div>
        </div>
      </div>

      <div
        class="stat-card glass-card glass-card-hover"
        :class="{ 'active-card': activeFilter === 'active' }"
        @click="activeFilter = 'active'"
      >
        <div class="stat-icon total">📋</div>
        <div class="stat-data">
          <div class="stat-value">{{ totalActiveCount }}</div>
          <div class="stat-label">待處理任務 (Active)</div>
        </div>
      </div>

      <div
        class="stat-card glass-card glass-card-hover"
        :class="{ 'active-card': activeFilter === 'completed' }"
        @click="activeFilter = 'completed'"
      >
        <div class="stat-icon completed">✅</div>
        <div class="stat-data">
          <div class="stat-value">{{ stats.completedCount }}</div>
          <div class="stat-label">已完成任務 (Completed)</div>
        </div>
      </div>
    </div>

    <!-- Main Dynamic Filtered Tasks Section (Clean Redmine Single-Line Style) -->
    <div class="content-section glass-card">
      <div class="section-header">
        <div class="section-title">
          <span class="title-icon">{{ currentFilterInfo.icon }}</span>
          <h2>{{ currentFilterInfo.title }}</h2>
        </div>
        <div class="header-right-tools">
          <n-button v-if="activeFilter !== 'active'" size="tiny" secondary @click="activeFilter = 'active'">
            🔄 重置全部分類
          </n-button>
          <n-tag size="small" round>顯示 {{ filteredTasks.length }} 項</n-tag>
        </div>
      </div>

      <n-spin :show="loading">
        <div v-if="filteredTasks.length === 0" class="empty-state">
          🎉 此類別目前沒有相符的任務項目。
        </div>

        <div v-else class="task-list">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="task-item glass-card-hover"
            @click="openEditTaskModal(task)"
          >
            <div class="task-left">
              <n-checkbox
                :checked="task.status === 'done'"
                @click.stop
                @update:checked="(val) => toggleTaskDone(task, val)"
              />
              <div class="task-single-line">
                <span class="project-tag">[{{ task.project_code }}]</span>
                <span class="task-title" :class="{ strike: task.status === 'done' }">
                  {{ task.title }}
                </span>
                <span
                  v-if="task.due_date"
                  class="due-tag"
                  :class="{
                    'is-overdue': task.due_date < todayDateString && task.status !== 'done',
                    'is-today': task.due_date === todayDateString
                  }"
                >
                  <template v-if="task.due_date < todayDateString && task.status !== 'done'">
                    ⚠️ 已逾期: {{ task.due_date }}
                  </template>
                  <template v-else-if="task.due_date === todayDateString">
                    ⏰ 今日截止: {{ task.due_date }}
                  </template>
                  <template v-else>
                    📅 截止: {{ task.due_date }}
                  </template>
                </span>
              </div>
            </div>

            <div class="task-right" @click.stop>
              <span class="priority-badge" :class="'badge-' + task.priority">
                {{ priorityText(task.priority) }}
              </span>
              <n-select
                size="tiny"
                style="width: 165px;"
                :options="statusOptions"
                :value="task.status"
                @update:value="(val) => updateTaskStatus(task, val)"
              />
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- Edit Task Modal with Assignee Select -->
    <n-modal v-model:show="showEditModal" preset="card" title="✏️ 編輯議題與 Task" style="width: 540px;">
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
import { NSpin, NTag, NCheckbox, NSelect, NModal, NForm, NFormItem, NInput, NDatePicker, NButton, useMessage } from 'naive-ui'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const message = useMessage()

const loading = ref(true)
const showEditModal = ref(false)
const submittingEdit = ref(false)
const activeFilter = ref<'active' | 'urgent' | 'due7' | 'completed'>('active')

const stats = ref({
  totalAssigned: 0,
  urgentCount: 0,
  dueIn7DaysCount: 0,
  completedCount: 0
})
const myTasks = ref<any[]>([])
const allUsers = ref<any[]>([])
const editForm = ref<any>(null)

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

const todayDateString = computed(() => new Date().toISOString().split('T')[0])
const sevenDaysLaterDateString = computed(() => {
  return new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
})

function isWithin7Days(dateStr: string) {
  if (!dateStr) return false
  return dateStr <= sevenDaysLaterDateString.value
}

const totalActiveCount = computed(() => {
  return myTasks.value.filter((t) => t.status !== 'done').length
})

const filteredTasks = computed(() => {
  switch (activeFilter.value) {
    case 'urgent':
      return myTasks.value.filter((t) => t.priority === 'urgent' && t.status !== 'done')
    case 'due7':
      return myTasks.value.filter((t) => t.due_date && isWithin7Days(t.due_date) && t.status !== 'done')
    case 'completed':
      return myTasks.value.filter((t) => t.status === 'done')
    case 'active':
    default:
      return myTasks.value.filter((t) => t.status !== 'done')
  }
})

const currentFilterInfo = computed(() => {
  switch (activeFilter.value) {
    case 'urgent':
      return { icon: '🔥', title: '緊急急件任務' }
    case 'due7':
      return { icon: '⏰', title: '七天內截止與已逾期任務' }
    case 'completed':
      return { icon: '✅', title: '已完成議題紀錄' }
    case 'active':
    default:
      return { icon: '📋', title: '所有待處理事項' }
  }
})

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

function priorityText(p: string) {
  switch (p) {
    case 'urgent': return '🔥 緊急'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return p
  }
}

async function fetchMyDayData() {
  if (!authStore.isAuthenticated || authStore.isLoggingOut) return
  loading.value = true
  try {
    const res = await axios.get('/api/dashboard/my-day')
    if (res.data.success) {
      stats.value = res.data.data.stats
      myTasks.value = res.data.data.myTasks
    }
  } catch (err) {
    if (authStore.isAuthenticated && !authStore.isLoggingOut) {
      message.error('載入儀表板資料失敗')
    }
  } finally {
    loading.value = false
  }
}

function openEditTaskModal(task: any) {
  editForm.value = { ...task }
  showEditModal.value = true
}

async function handleSaveTask() {
  if (!editForm.value) return
  submittingEdit.value = true
  try {
    const res = await axios.put(`/api/issues/${editForm.value.id}`, editForm.value)
    if (res.data.success) {
      message.success('任務修改成功！')
      showEditModal.value = false
      fetchMyDayData()
    }
  } catch (err) {
    message.error('修改任務失敗')
  } finally {
    submittingEdit.value = false
  }
}

async function handleDeleteTask() {
  if (!editForm.value) return
  try {
    const res = await axios.delete(`/api/issues/${editForm.value.id}`)
    if (res.data.success) {
      message.success('任務已刪除')
      showEditModal.value = false
      fetchMyDayData()
    }
  } catch (err) {
    message.error('刪除失敗')
  }
}

async function updateTaskStatus(task: any, newStatus: string) {
  try {
    const res = await axios.put(`/api/issues/${task.id}`, { status: newStatus })
    if (res.data.success) {
      task.status = newStatus
      message.success('議題狀態已更新')
      fetchMyDayData()
    }
  } catch (err) {
    message.error('更新失敗')
  }
}

async function toggleTaskDone(task: any, isDone: boolean) {
  const newStatus = isDone ? 'done' : 'in_progress'
  await updateTaskStatus(task, newStatus)
}

onMounted(() => {
  fetchMyDayData()
  fetchUsers()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Stats Cards Grid with Active Filter Styling */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  border: 1px solid var(--border-glass);
  transition: all 0.2s ease;
}

.stat-card.active-card {
  border-color: var(--text-main);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  background: rgba(161, 161, 170, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(161, 161, 170, 0.1);
  border: 1px solid var(--border-glass);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 2px;
}

.content-section {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.header-right-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 1.2rem;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Redmine Clean Single-Line Style */
.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(161, 161, 170, 0.04);
  padding: 12px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  border-color: var(--text-main);
}

.task-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  overflow: hidden;
}

.task-single-line {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
}

.project-tag {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted);
  flex-shrink: 0;
}

.task-title {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-title.strike {
  text-decoration: line-through;
  color: var(--text-muted);
}

.due-tag {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-left: 6px;
  flex-shrink: 0;
}

.due-tag.is-overdue {
  color: #ef4444;
  font-weight: 800;
}

.due-tag.is-today {
  color: var(--text-main);
  font-weight: 800;
}

.task-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
}

.empty-state {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 30px 0;
}
</style>
