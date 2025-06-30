export type AdminTab = 'analytics' | 'agenda' | 'chats' | 'database'

export interface AdminState {
  activeTab: AdminTab
  loading: boolean
  error: string | null
}

export interface AdminUser {
  id: string
  email?: string
  role: 'admin' | 'user'
  lastActive?: string
}