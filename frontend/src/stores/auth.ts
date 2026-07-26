import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export interface User {
  id: number
  username: string
  name: string
  email: string
  role: 'admin' | 'user'
  avatar_url?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('axpo_user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('axpo_token'))
  const isLoggingOut = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value && !isLoggingOut.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Configure default axios header
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  // Global 401 Interceptor: Silence errors completely if logging out or unauthenticated
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        token.value = null
        user.value = null
        localStorage.removeItem('axpo_token')
        localStorage.removeItem('axpo_user')
        delete axios.defaults.headers.common['Authorization']
      }
      return Promise.reject(error)
    }
  )

  async function login(username: string, password_hash: string) {
    isLoggingOut.value = false
    const res = await axios.post('/api/auth/login', { username, password: password_hash })
    if (res.data.success) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('axpo_token', res.data.token)
      localStorage.setItem('axpo_user', JSON.stringify(res.data.user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      return { success: true }
    }
    return { success: false, message: res.data.message }
  }

  function logout() {
    isLoggingOut.value = true
    token.value = null
    user.value = null
    localStorage.removeItem('axpo_token')
    localStorage.removeItem('axpo_user')
    delete axios.defaults.headers.common['Authorization']
  }

  return {
    user,
    token,
    isLoggingOut,
    isAuthenticated,
    isAdmin,
    login,
    logout
  }
})
