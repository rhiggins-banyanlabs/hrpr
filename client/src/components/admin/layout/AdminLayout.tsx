// components/admin/AdminLayout.tsx
"use client"
import { useState } from 'react'
import { useAdminAuth } from '../security/AdminAuthContext'
import { useRouter } from 'next/navigation'
import Waves from '@/components/waves'
import AdminHeader from './AdminHeader'
import AdminTabs, { TabItem } from './AdminTabs'
import EnhancedAnalyticsTab from '../features/analytics/EnhancedAnalyticsTab'
import { ConferenceAgenda } from '../features/conference/ConferenceAgenda'
import ChatSessionsTab from '../features/chat-sessions/ChatSessionsTab'
import DatabaseTab from '../features/database/DatabaseTab'
import PedestalModeTab from '../features/pedestal/PedestalModeTab'
import { FeedbackAnalytics } from '../features/feedback/FeedbackAnalytics'
import { IntentManager } from '../IntentManager'
import { BarChart3, Calendar, MessageSquare, Database, Monitor, LogOut, ThumbsUp, Brain, Menu, X } from 'lucide-react'

const tabs: TabItem[] = [
  { id: 'pedestal', label: 'Pedestal Mode', icon: <Monitor className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'agenda', label: 'Conference Agenda', icon: <Calendar className="h-4 w-4" /> },
  { id: 'chats', label: 'Chat Sessions', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'feedback', label: 'Session Feedback', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'intent-training', label: 'Intent Training', icon: <Brain className="h-4 w-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="h-4 w-4" /> }
]

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('pedestal') // Explicitly set pedestal as default
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
        return <EnhancedAnalyticsTab />
      case 'agenda':
        return <ConferenceAgenda />
      case 'chats':
        return <ChatSessionsTab />
      case 'feedback':
        return <FeedbackAnalytics />
      case 'intent-training':
        return <IntentManager />
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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setIsMobileMenuOpen(false) // Close mobile menu when tab is selected
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
      <div className="relative z-10 flex flex-col h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          <h1 className="text-lg font-bold text-green-400">HRPR Admin</h1>
          
          <button
            onClick={handleLogout}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-6 pb-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <AdminHeader 
                  title="HRPR Admin Dashboard"
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
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mobile Sidebar */}
          <div className={`lg:hidden fixed inset-0 z-40 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-lg font-bold text-green-400 mb-4">Navigation</h2>
                <div className="space-y-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                
                {/* Mobile Status */}
                <div className="mt-6 p-3 rounded-lg bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                    <span className={`text-xs ${status.color}`}>{status.text}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Tabs and Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20">
            <div className="max-w-7xl mx-auto">
              {/* Desktop Tabs */}
              <div className="hidden lg:block mb-6">
                <AdminTabs 
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
              </div>
              
              {/* Tab Content */}
              <div className="space-y-6">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}