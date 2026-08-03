import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export interface Project {
  id: number
  name: string
  code: string
  description?: string
  status: string
  created_by: number
  owner_name?: string
  issue_count?: number
  completed_issue_count?: number
  member_count?: number
  members?: any[]
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)

  async function fetchProjects() {
    loading.value = true
    try {
      const res = await axios.get('/api/projects')
      if (res.data.success) {
        projects.value = res.data.projects
        if (projects.value.length > 0 && currentProject.value === undefined) {
          currentProject.value = projects.value[0]
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects', err)
    } finally {
      loading.value = false
    }
  }

  function setCurrentProject(project: Project | null) {
    currentProject.value = project
  }

  async function updateProject(id: number, data: { name?: string; description?: string; status?: string }) {
    try {
      const res = await axios.patch(`/api/projects/${id}`, data)
      if (res.data.success) {
        if (currentProject.value && currentProject.value.id === id) {
          currentProject.value = { ...currentProject.value, ...res.data.project }
        }
        await fetchProjects()
        return { success: true, message: res.data.message }
      }
      return { success: false, message: res.data.message || '更新專案失敗' }
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || '更新專案失敗' }
    }
  }

  return {
    projects,
    currentProject,
    loading,
    fetchProjects,
    setCurrentProject,
    updateProject
  }
})
