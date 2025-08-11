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
    <Card className="p-2 mb-6 lg:mb-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 xl:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 xl:gap-2 text-sm xl:text-base ${
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