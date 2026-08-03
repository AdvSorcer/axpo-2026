<template>
  <div class="login-wrapper">
    <div class="login-box glass-card">
      <div class="header">
        <div class="logo">⚡</div>
        <h2>{{ configStore.appName }} 專案管理平台</h2>
      </div>

      <n-form ref="formRef" :model="form" class="form">
        <n-form-item label="帳號 (Username)">
          <n-input v-model:value="form.username" placeholder="請輸入帳號" size="large" />
        </n-form-item>

        <n-form-item label="密碼 (Password)">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="請輸入密碼"
            size="large"
            @keyup.enter="handleLogin"
          />
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          class="login-btn"
          @click="handleLogin"
        >
          登入系統
        </n-button>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useProjectStore } from '../stores/project'
import { useConfigStore } from '../stores/config'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const configStore = useConfigStore()

const loading = ref(false)
const form = ref({
  username: '',
  password: ''
})

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    message.warning('請輸入帳號與密碼')
    return
  }

  loading.value = true
  try {
    const res = await authStore.login(form.value.username, form.value.password)
    if (res.success) {
      message.success(`歡迎回來，${authStore.user?.name}！`)
      await projectStore.fetchProjects()
      router.push('/')
    } else {
      message.error(res.message || '登入失敗')
    }
  } catch (err: any) {
    message.error('連線後端發生錯誤')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
}

.login-box {
  width: 420px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  text-align: center;
}

.logo {
  width: 54px;
  height: 54px;
  margin: 0 auto 16px auto;
  background: var(--primary-gradient);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

h2 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form {
  margin-top: 8px;
}

.login-btn {
  margin-top: 12px;
  background: var(--primary-gradient);
  border: none;
  font-weight: 700;
}
</style>
