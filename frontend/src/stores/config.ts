import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const appName = ref<string>(import.meta.env.VITE_APP_NAME || 'AXPO')

  async function fetchConfig() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        if (data.appName) {
          appName.value = data.appName
          document.title = `${data.appName} 專案管理平台`
        }
      }
    } catch (e) {
      console.warn('Failed to fetch app config, using default:', appName.value)
    }
  }

  return {
    appName,
    fetchConfig,
  }
})
