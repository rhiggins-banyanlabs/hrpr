// components/admin/AdminLayout.tsx
"use client"
import { useState } from 'react'
import { useAdminAuth } from '../security/AdminAuthContext'
import { useRouter } from 'next/navigation'
import Waves from '@/components/waves'
import AdminHeader from './AdminHeader'
import AdminTabs, { TabItem } from './AdminTabs'
import AnalyticsTab from '../features/analytics/AnalyticsTab'
import ConferenceTab from '../features/conference/ConferenceTab'
import ChatSessionsTab from '../features/chat-sessions/ChatSessionsTab'
import DatabaseTab from '../features/database/DatabaseTab'
import PedestalModeTab from '../features/pedestal/PedestalModeTab'
import { FeedbackAnalytics } from '../features/feedback/FeedbackAnalytics'
import { BarChart3, Calendar, MessageSquare, Database, Monitor, LogOut, ThumbsUp } from 'lucide-react'

const tabs: TabItem[] = [
  { id: 'pedestal', label: 'Pedestal Mode', icon: <Monitor className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'agenda', label: 'Conference Agenda', icon: <Calendar className="h-4 w-4" /> },
  { id: 'chats', label: 'Chat Sessions', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'feedback', label: 'Session Feedback', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="h-4 w-4" /> }
]

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('pedestal') // Explicitly set pedestal as default
  const { isAuthenticated, logout, isPedestalMode, isSystemLocked } = useAdminAuth()
  const router = useRouter()

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/')
    return null
  }

  // Debug log to confirm default tab
  console.log('🏗️ AdminLayout rendered with activeTab:', activeTab)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pedestal':
        return <PedestalModeTab />
      case 'analytics':
        return <AnalyticsTab />
      case 'agenda':
        return <ConferenceTab />
      case 'chats':
        return <ChatSessionsTab />
      case 'feedback':
        return <FeedbackAnalytics />
      case 'database':
        return <DatabaseTab />
      default:
        console.log('⚠️ Unknown tab, defaulting to pedestal:', activeTab)
        return <PedestalModeTab />
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getSystemStatus = () => {
    if (isPedestalMode) {
      return {
        text: 'System Active (Pedestal Mode)',
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        dot: 'bg-green-400'
      }
    } else {
      return {
        text: 'System Locked (Admin Only)',
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        dot: 'bg-red-400'
      }
    }
  }

  const status = getSystemStatus()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Waves Background */}
      <Waves
        lineColor="rgba(79, 70, 229, 0.6)"
        backgroundColor="black"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
        waveAmpX={40}
        waveAmpY={20}
        friction={0.9}
        tension={0.01}
        maxCursorMove={120}
        xGap={12}
        yGap={36}
      />

      {/* Content Container */}
      <div className="relative z-10 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header with Status and Logout */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1">
              <AdminHeader 
                title="Beacon Admin Dashboard"
                description="Configure and monitor the Harper AI system for your conference"
              />
            </div>
            
            {/* Status Indicator and Logout */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${status.bg} border ${status.border}`}>
                <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                <span className={`text-sm font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600/30 hover:text-red-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
          
          <AdminTabs 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          {/* Tab Content */}
          <div className="space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}