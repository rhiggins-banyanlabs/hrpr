"use client"

import { useState } from 'react'
import Waves from '@/components/waves'
import AdminHeader from './AdminHeader'
import AdminTabs, { TabItem } from './AdminTabs'
import AnalyticsTab from '../features/analytics/AnalyticsTab'
import ConferenceTab from '../features/conference/ConferenceTab'
import ChatSessionsTab from '../features/chat-sessions/ChatSessionsTab'
import DatabaseTab from '../features/database/DatabaseTab'

const tabs: TabItem[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'agenda', label: 'Conference Agenda' },
  { id: 'chats', label: 'Chat Sessions' },
  { id: 'database', label: 'Database' }
]

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('analytics')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsTab />
      case 'agenda':
        return <ConferenceTab />
      case 'chats':
        return <ChatSessionsTab />
      case 'database':
        return <DatabaseTab />
      default:
        return <AnalyticsTab />
    }
  }

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
          <AdminHeader />
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