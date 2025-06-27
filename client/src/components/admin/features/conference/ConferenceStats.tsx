import Card, { CardContent, CardHeader } from '../../ui/Card'

interface ConferenceStatsProps {
  speakersCount: number
  sessionsCount: number
}

export default function ConferenceStats({ speakersCount, sessionsCount }: ConferenceStatsProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-xl font-semibold text-white">Conference Stats</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{speakersCount}</div>
            <div className="text-white/60 text-sm">Speakers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{sessionsCount}</div>
            <div className="text-white/60 text-sm">Sessions</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}