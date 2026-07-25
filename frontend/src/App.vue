<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null" :theme-overrides="currentThemeOverrides">
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <div class="app-layout" v-if="authStore.isAuthenticated">
            <!-- Header Navbar -->
            <header class="navbar glass-card">
              <div class="nav-left">
                <router-link to="/" class="brand">
                  <div class="logo-icon">⚡</div>
                  <span class="brand-name">AXPO <span class="brand-badge">2026</span></span>
                </router-link>

                <!-- Navigation Tabs -->
                <nav class="nav-links">
                  <router-link to="/" class="nav-item" :class="{ active: route.name === 'dashboard' }">
                    <span class="icon">✨</span>
                    <span>今日焦點</span>
                  </router-link>
                  <router-link to="/projects" class="nav-item" :class="{ active: route.name === 'projects' || route.params.id === 'all' }">
                    <span class="icon">📁</span>
                    <span>專案總覽</span>
                  </router-link>
                  <router-link to="/timeline" class="nav-item" :class="{ active: route.name === 'timeline' }">
                    <span class="icon">📅</span>
                    <span>時程圖</span>
                  </router-link>
                  <router-link v-if="authStore.isAdmin" to="/admin/users" class="nav-item" :class="{ active: route.name === 'admin-users' }">
                    <span class="icon">🛡️</span>
                    <span>成員與權限</span>
                  </router-link>
                </nav>
              </div>

              <div class="nav-right">
                <!-- Theme Mode Toggle -->
                <n-button size="small" circle secondary @click="toggleTheme" class="theme-toggle-btn">
                  {{ isDarkMode ? '☀️' : '🌙' }}
                </n-button>

                <!-- Project Quick Switcher -->
                <div class="project-switcher" v-if="projectStore.projects.length > 0">
                  <span class="switcher-label">切換專案:</span>
                  <n-select
                    size="small"
                    style="width: 380px;"
                    :options="projectOptions"
                    :value="currentSelectedValue"
                    @update:value="handleProjectSelect"
                  />
                </div>

                <!-- User Profile Menu -->
                <n-dropdown :options="userMenuOptions" @select="handleUserMenuSelect">
                  <div class="user-profile">
                    <img :src="authStore.user?.avatar_url" class="avatar" />
                    <div class="user-info">
                      <div class="user-name">{{ authStore.user?.name }}</div>
                      <div class="user-role-badge">
                        {{ authStore.user?.role === 'admin' ? '系統管理員' : '一般成員' }}
                      </div>
                    </div>
                  </div>
                </n-dropdown>
              </div>
            </header>

            <!-- Main Content Container -->
            <main class="main-content">
              <router-view />
            </main>
          </div>

          <!-- Login View Layout -->
          <div v-else class="login-layout">
            <router-view />
          </div>
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  darkTheme,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NSelect,
  NDropdown,
  NButton,
  GlobalThemeOverrides
} from 'naive-ui'
import { useAuthStore } from './stores/auth'
import { useProjectStore } from './stores/project'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const isDarkMode = ref(false)

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.body.classList.remove('light-mode')
  } else {
    document.body.classList.add('light-mode')
  }
}

const currentThemeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: isDarkMode.value ? '#ffffff' : '#09090b',
    primaryColorHover: isDarkMode.value ? '#e4e4e7' : '#27272a',
    primaryColorPressed: isDarkMode.value ? '#d4d4d8' : '#18181b',
    borderRadius: '8px',
  },
  Button: {
    colorPrimary: isDarkMode.value ? '#ffffff' : '#09090b',
    textColorPrimary: isDarkMode.value ? '#09090b' : '#ffffff',
    colorHoverPrimary: isDarkMode.value ? '#e4e4e7' : '#27272a',
    textColorHoverPrimary: isDarkMode.value ? '#09090b' : '#ffffff',
  },
  Card: {
    color: isDarkMode.value ? 'rgba(24, 24, 27, 0.85)' : '#ffffff',
    borderColor: isDarkMode.value ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
  }
}))

onMounted(() => {
  document.body.classList.add('light-mode')
  if (authStore.isAuthenticated) {
    projectStore.fetchProjects()
  }
})

const projectOptions = computed(() => {
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

const currentSelectedValue = computed(() => {
  if (route.params.id === 'all') return 0
  return projectStore.currentProject?.id || 0
})

function handleProjectSelect(value: number) {
  if (value === 0) {
    projectStore.setCurrentProject(null)
    router.push('/projects/all')
  } else {
    const p = projectStore.projects.find(x => x.id === value)
    if (p) {
      projectStore.setCurrentProject(p)
      router.push(`/projects/${p.id}`)
    }
  }
}

const userMenuOptions = [
  { label: '登出系統', key: 'logout' }
]

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  height: 64px;
  margin: 16px 24px 0 24px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-main);
  font-weight: 800;
  font-size: 1.25rem;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: var(--text-main);
  color: var(--bg-dark-base);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 900;
}

.brand-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  background: rgba(161, 161, 170, 0.15);
  color: var(--text-muted);
  border-radius: 4px;
  border: 1px solid var(--border-glass);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: var(--text-main);
  background: rgba(161, 161, 170, 0.1);
}

.nav-item.active {
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border-glass);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 8px;
}

.switcher-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-profile:hover {
  background: rgba(161, 161, 170, 0.1);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--border-glass);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.user-role-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
}

.login-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
