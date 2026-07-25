<template>
  <div class="admin-users-page">
    <div class="header-section">
      <div>
        <h1>成員與權限管理</h1>
        <p class="subtitle">點擊成員卡片即可編輯個人資料與系統權限（系統管理員 / 一般成員）</p>
      </div>

      <n-button type="primary" size="large" class="create-btn" @click="showModal = true">
        ➕ 新增使用者帳號
      </n-button>
    </div>

    <n-spin :show="loading">
      <div class="users-grid">
        <div
          v-for="u in users"
          :key="u.id"
          class="user-card glass-card glass-card-hover"
          @click="openEditUserModal(u)"
        >
          <img :src="u.avatar_url" class="u-avatar" />
          <div class="u-info">
            <div class="u-name-row">
              <h3>{{ u.name }}</h3>
              <span class="u-role-badge" :class="u.role">
                {{ u.role === 'admin' ? '🛡️ 系統管理員' : '👤 一般成員' }}
              </span>
            </div>
            <div class="u-meta">帳號: @{{ u.username }}</div>
            <div class="u-meta">信箱: {{ u.email }}</div>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- Create User Modal -->
    <n-modal v-model:show="showModal" preset="card" title="新增使用者帳號" style="width: 480px;">
      <n-form :model="userForm">
        <n-form-item label="登入帳號 (Username)">
          <n-input v-model:value="userForm.username" placeholder="例如: bob" />
        </n-form-item>
        <n-form-item label="登入密碼">
          <n-input v-model:value="userForm.password" type="password" placeholder="密碼..." />
        </n-form-item>
        <n-form-item label="顯示姓名">
          <n-input v-model:value="userForm.name" placeholder="例如: 王小華 (Bob)" />
        </n-form-item>
        <n-form-item label="電子信箱">
          <n-input v-model:value="userForm.email" placeholder="bob@axpo.io" />
        </n-form-item>
        <n-form-item label="系統角色">
          <n-select v-model:value="userForm.role" :options="roleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleCreateUser">建立帳號</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Edit User Modal (Triggered on Card Click) -->
    <n-modal v-model:show="showEditModal" preset="card" title="✏️ 編輯成員資料與權限" style="width: 500px;">
      <n-form :model="editUserForm" v-if="editUserForm">
        <n-form-item label="帳號 (無法修改)">
          <n-input :value="'@' + editUserForm.username" disabled />
        </n-form-item>
        <n-form-item label="顯示姓名">
          <n-input v-model:value="editUserForm.name" />
        </n-form-item>
        <n-form-item label="電子信箱">
          <n-input v-model:value="editUserForm.email" />
        </n-form-item>
        <n-form-item label="登入密碼 (留空代表不修改)">
          <n-input v-model:value="editUserForm.password" type="password" placeholder="若無變更請留空" />
        </n-form-item>
        <n-form-item label="系統角色權限">
          <n-select v-model:value="editUserForm.role" :options="roleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="submittingEdit" @click="handleUpdateUser">儲存變更</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NSpin, NModal, NForm, NFormItem, NInput, NSelect, useMessage } from 'naive-ui'
import axios from 'axios'

const message = useMessage()
const loading = ref(false)
const users = ref<any[]>([])
const showModal = ref(false)
const showEditModal = ref(false)
const submitting = ref(false)
const submittingEdit = ref(false)

const userForm = ref({
  username: '',
  password: '',
  name: '',
  email: '',
  role: 'user'
})

const editUserForm = ref<any>(null)

const roleOptions = [
  { label: '一般成員 (user)', value: 'user' },
  { label: '系統管理員 (admin)', value: 'admin' }
]

async function fetchUsers() {
  loading.value = true
  try {
    const res = await axios.get('/api/users')
    if (res.data.success) {
      users.value = res.data.users
    }
  } catch (err) {
    message.error('無法載入使用者列表')
  } finally {
    loading.value = false
  }
}

function openEditUserModal(user: any) {
  editUserForm.value = { ...user, password: '' }
  showEditModal.value = true
}

async function handleCreateUser() {
  if (!userForm.value.username || !userForm.value.password || !userForm.value.name) {
    message.warning('請填寫完整帳號資料')
    return
  }

  submitting.value = true
  try {
    const res = await axios.post('/api/users', userForm.value)
    if (res.data.success) {
      message.success('使用者帳號建立成功！')
      showModal.value = false
      userForm.value = { username: '', password: '', name: '', email: '', role: 'user' }
      fetchUsers()
    } else {
      message.error(res.data.message || '建立失敗')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '建立失敗')
  } finally {
    submitting.value = false
  }
}

async function handleUpdateUser() {
  if (!editUserForm.value) return
  submittingEdit.value = true
  try {
    const res = await axios.put(`/api/users/${editUserForm.value.id}`, editUserForm.value)
    if (res.data.success) {
      message.success('成員資料更新成功！')
      showEditModal.value = false
      fetchUsers()
    }
  } catch (err: any) {
    message.error('更新成員失敗')
  } finally {
    submittingEdit.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.admin-users-page {
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

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.user-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  position: relative;
}

.u-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid var(--border-glass);
}

.u-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.u-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.u-name-row h3 {
  font-size: 1rem;
  color: var(--text-main);
  font-weight: 700;
}

.u-role-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
}

.u-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.edit-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 600;
}
</style>
