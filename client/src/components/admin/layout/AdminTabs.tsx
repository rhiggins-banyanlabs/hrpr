import Card from '../ui/Card'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
}

interface AdminTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function AdminTabs({ tabs, activeTab, onTabChange }: AdminTabsProps) {
  return (
    <Card className="p-2 mb-8">
      <div className="flex space-x-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg cursor-pointer'
                : 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </Card>
  )
}