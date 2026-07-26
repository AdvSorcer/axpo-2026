<template>
  <div class="projects-page">
    <div class="header-section">
      <div>
        <h1>所有專案列表</h1>
      </div>

      <n-button v-if="authStore.isAdmin" type="primary" size="large" class="create-btn" @click="showCreateModal = true">
        ➕ 建立新專案 (Admin Only)
      </n-button>
    </div>

    <n-spin :show="loading">
      <div class="projects-grid">
        <div
          v-for="p in projectStore.projects"
          :key="p.id"
          class="project-card glass-card glass-card-hover"
          @click="selectProject(p)"
        >
          <div class="project-card-header">
            <div class="project-code">[{{ p.code }}]</div>
            <n-tag size="small" round>Active</n-tag>
          </div>

          <h3 class="project-name">{{ p.name }}</h3>
          <p class="project-desc">{{ p.description || '無描述' }}</p>

          <div class="project-footer">
            <div class="stat-badge">
              <span>📋 議題: {{ p.issue_count || 0 }} (已完成 {{ p.completed_issue_count || 0 }})</span>
            </div>
            <div class="owner-name">👑 {{ p.owner_name }}</div>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- Create Project Modal -->
    <n-modal v-model:show="showCreateModal" preset="card" title="建立新專案" style="width: 500px;">
      <n-form :model="newProjectForm" class="modal-form">
        <n-form-item label="專案名稱">
          <n-input v-model:value="newProjectForm.name" placeholder="例如: AI 數據智慧分析系統" />
        </n-form-item>
        <n-form-item label="專案代碼 (Unique Code)">
          <n-input v-model:value="newProjectForm.code" placeholder="例如: AI-DATA (會自動轉大寫)" />
        </n-form-item>
        <n-form-item label="專案描述">
          <n-input v-model:value="newProjectForm.description" type="textarea" placeholder="輸入專案目標與範疇..." />
        </n-form-item>
      </n-form>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="handleCreateProject">確認建立</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpin, NTag, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useProjectStore, Project } from '../stores/project'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const loading = ref(false)
const showCreateModal = ref(false)
const creating = ref(false)
const newProjectForm = ref({
  name: '',
  code: '',
  description: ''
})

onMounted(() => {
  if (authStore.isAuthenticated && !authStore.isLoggingOut) {
    projectStore.fetchProjects()
  }
})

function selectProject(p: Project) {
  projectStore.setCurrentProject(p)
  router.push(`/projects/${p.id}`)
}

async function handleCreateProject() {
  if (!newProjectForm.value.name || !newProjectForm.value.code) {
    message.warning('請填寫專案名稱與專案代碼')
    return
  }

  creating.value = true
  try {
    const res = await axios.post('/api/projects', newProjectForm.value)
    if (res.data.success) {
      message.success('新專案建立成功！')
      showCreateModal.value = false
      newProjectForm.value = { name: '', code: '', description: '' }
      projectStore.fetchProjects()
    } else {
      message.error(res.data.message || '建立失敗')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '建立失敗')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.projects-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h1 {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-main);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 4px;
}

.create-btn {
  font-weight: 700;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.project-card {
  padding: 24px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 180px;
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-code {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.project-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 12px 0 6px 0;
}

.project-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 20px;
}

.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-glass);
  padding-top: 12px;
  font-size: 0.8rem;
}

.stat-badge {
  color: var(--text-main);
  font-weight: 600;
}

.owner-name {
  color: var(--text-muted);
}
</style>
