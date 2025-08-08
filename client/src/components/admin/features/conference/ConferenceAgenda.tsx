import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Card, { CardContent, CardHeader } from '../../ui/Card';
import Badge from '../../ui/Badge';

interface ScheduleEvent {
  id: string;
  day: string;
  time: string;
  event: string;
  location?: string;
  event_type?: string;
  start_time?: string;
  end_time?: string;
  building?: string;
  room?: string;
  presenter?: string;
  description?: string;
  notes?: string;
}

interface CommitteeMeeting {
  id: string;
  day: string;
  committee_name: string;
  meeting_type: string;
  start_time: string;
  end_time: string;
  location: string;
  description?: string;
}

interface FacilityTour {
  id: string;
  day: string;
  facility: string;
  tour_time: string;
  departure_time: string;
  return_time: string;
  location: string;
  bus_number?: string;
  description?: string;
}

const CONFERENCE_DAYS = [
  { date: 'August 21', day: 'Thursday', shortDay: 'Thu' },
  { date: 'August 22', day: 'Friday', shortDay: 'Fri' },
  { date: 'August 23', day: 'Saturday', shortDay: 'Sat' },
  { date: 'August 24', day: 'Sunday', shortDay: 'Sun' },
  { date: 'August 25', day: 'Monday', shortDay: 'Mon' }
];

export const ConferenceAgenda: React.FC = () => {
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [committeeMeetings, setCommitteeMeetings] = useState<CommitteeMeeting[]>([]);
  const [facilityTours, setFacilityTours] = useState<FacilityTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('August 21');
  const [viewType, setViewType] = useState<'schedule' | 'meetings' | 'tours' | 'all'>('schedule');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load conference schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('conference_schedule')
        .select('*')
        .order('start_time', { ascending: true });

      if (scheduleError) throw scheduleError;

      // Load committee meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('committee_meetings')
        .select('*')
        .order('start_time', { ascending: true });

      if (meetingsError) console.warn('Committee meetings not available:', meetingsError);

      // Load facility tours
      const { data: toursData, error: toursError } = await supabase
        .from('facility_tours')
        .select('*')
        .order('tour_time', { ascending: true });

      if (toursError) console.warn('Facility tours not available:', toursError);

      setScheduleEvents(scheduleData || []);
      setCommitteeMeetings(meetingsData || []);
      setFacilityTours(toursData || []);

      // Debug logging
      console.log('📅 Loaded schedule events:', scheduleData?.length || 0);
      console.log('🏛️ Loaded committee meetings:', meetingsData?.length || 0);
      console.log('🚌 Loaded facility tours:', toursData?.length || 0);
      if (scheduleData?.length) {
        console.log('Sample schedule event:', scheduleData[0]);
      }
      if (meetingsData?.length) {
        console.log('Sample committee meeting:', meetingsData[0]);
      }
    } catch (err) {
      setError('Failed to load conference data');
      console.error('Error loading conference data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  };

  const getEventTypeBadge = (type: string | undefined) => {
    if (!type) return null;
    
    const typeColors: { [key: string]: string } = {
      'keynote': 'success',
      'workshop': 'info',
      'networking': 'warning',
      'session': 'default',
      'break': 'default',
      'social': 'warning',
      'tour': 'info'
    };

    const variant = typeColors[type.toLowerCase()] || 'default';
    return <Badge variant={variant as any}>{type}</Badge>;
  };

  const getEventsForDay = (day: string) => {
    // Convert "August 21" to the actual day name like "Wednesday"
    const dayInfo = CONFERENCE_DAYS.find(d => d.date === day);
    const dayName = dayInfo?.day;
    
    if (!dayName) return [];
    
    const filtered = scheduleEvents.filter(event => 
      event.day && (
        event.day.toLowerCase().includes(dayName.toLowerCase()) ||
        event.day.toLowerCase().includes(dayInfo.shortDay.toLowerCase())
      )
    );

    // Debug logging for the current day
    if (day === selectedDay) {
      console.log(`🔍 Filtering events for ${day} (${dayName}):`, {
        totalEvents: scheduleEvents.length,
        filteredEvents: filtered.length,
        allDayValues: [...new Set(scheduleEvents.map(e => e.day))],
        lookingFor: dayName.toLowerCase(),
        firstFewEvents: scheduleEvents.slice(0, 3).map(e => ({ day: e.day, event: e.event }))
      });
    }
    
    return filtered;
  };

  const getMeetingsForDay = (day: string) => {
    // Convert "August 21" to the actual day name like "Wednesday"
    const dayInfo = CONFERENCE_DAYS.find(d => d.date === day);
    const dayName = dayInfo?.day;
    
    if (!dayName) return [];
    
    return committeeMeetings.filter(meeting => 
      meeting.day && (
        meeting.day.toLowerCase().includes(dayName.toLowerCase()) ||
        meeting.day.toLowerCase().includes(dayInfo.shortDay.toLowerCase())
      )
    );
  };

  const getToursForDay = (day: string) => {
    // Convert "August 21" to the actual day name like "Wednesday"
    const dayInfo = CONFERENCE_DAYS.find(d => d.date === day);
    const dayName = dayInfo?.day;
    
    if (!dayName) return [];
    
    return facilityTours.filter(tour => 
      tour.day && (
        tour.day.toLowerCase().includes(dayName.toLowerCase()) ||
        tour.day.toLowerCase().includes(dayInfo.shortDay.toLowerCase())
      )
    );
  };

  const getUniqueEventTypes = () => {
    const types = new Set<string>();
    scheduleEvents.forEach(event => {
      if (event.event_type) types.add(event.event_type);
    });
    return Array.from(types).sort();
  };

  const filteredEvents = () => {
    let events = getEventsForDay(selectedDay);
    if (eventTypeFilter !== 'all') {
      events = events.filter(e => e.event_type === eventTypeFilter);
    }
    return events;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-12 bg-white/10 rounded mb-4"></div>
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-white/10 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Conference Agenda</h2>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* Day Selection */}
      <div className="grid grid-cols-5 gap-2">
        {CONFERENCE_DAYS.map((dayInfo) => (
          <button
            key={dayInfo.date}
            onClick={() => setSelectedDay(dayInfo.date)}
            className={`p-4 rounded-lg transition-all ${
              selectedDay === dayInfo.date
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <div className="font-semibold">{dayInfo.shortDay}</div>
            <div className="text-sm">{dayInfo.date}</div>
          </button>
        ))}
      </div>

      {/* View Type and Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewType('schedule')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewType === 'schedule'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Main Schedule ({getEventsForDay(selectedDay).length})
              </button>
              {committeeMeetings.length > 0 && (
                <button
                  onClick={() => setViewType('meetings')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewType === 'meetings'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Committee Meetings ({getMeetingsForDay(selectedDay).length})
                </button>
              )}
              {facilityTours.length > 0 && (
                <button
                  onClick={() => setViewType('tours')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewType === 'tours'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Facility Tours ({getToursForDay(selectedDay).length})
                </button>
              )}
              <button
                onClick={() => setViewType('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewType === 'all'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                All Events
              </button>
            </div>

            {viewType === 'schedule' && (
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20"
              >
                <option value="all">All Event Types</option>
                {getUniqueEventTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Display */}
      {(viewType === 'schedule' || viewType === 'all') && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">
              {selectedDay} - Main Schedule
            </h3>
          </CardHeader>
          <CardContent>
            {filteredEvents().length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No events scheduled for this day
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents().map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white/60 font-mono text-sm">
                            {event.time || formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                          {getEventTypeBadge(event.event_type)}
                        </div>
                        <h4 className="text-white font-semibold text-lg mb-1">
                          {event.event}
                        </h4>
                        {event.presenter && (
                          <p className="text-white/70 text-sm mb-1">
                            Presenter: {event.presenter}
                          </p>
                        )}
                        {(event.location || event.building || event.room) && (
                          <p className="text-blue-400 text-sm">
                            📍 {event.location || `${event.building || ''} ${event.room || ''}`.trim()}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-white/60 text-sm mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Committee Meetings */}
      {(viewType === 'meetings' || viewType === 'all') && committeeMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">
              {selectedDay} - Committee Meetings
            </h3>
          </CardHeader>
          <CardContent>
            {getMeetingsForDay(selectedDay).length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No committee meetings scheduled for this day
              </div>
            ) : (
              <div className="space-y-3">
                {getMeetingsForDay(selectedDay).map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white/60 font-mono text-sm">
                        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                      </span>
                      <Badge variant="success">{meeting.meeting_type}</Badge>
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-1">
                      {meeting.committee_name}
                    </h4>
                    <p className="text-green-400 text-sm">
                      📍 {meeting.location}
                    </p>
                    {meeting.description && (
                      <p className="text-white/60 text-sm mt-2">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Facility Tours */}
      {(viewType === 'tours' || viewType === 'all') && facilityTours.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">
              {selectedDay} - Facility Tours
            </h3>
          </CardHeader>
          <CardContent>
            {getToursForDay(selectedDay).length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No facility tours scheduled for this day
              </div>
            ) : (
              <div className="space-y-3">
                {getToursForDay(selectedDay).map((tour) => (
                  <div
                    key={tour.id}
                    className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white/60 font-mono text-sm">
                        Depart: {formatTime(tour.departure_time)} | Return: {formatTime(tour.return_time)}
                      </span>
                      <Badge variant="info">Facility Tour</Badge>
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-1">
                      {tour.facility}
                    </h4>
                    <p className="text-purple-400 text-sm">
                      📍 {tour.location}
                      {tour.bus_number && ` | Bus #${tour.bus_number}`}
                    </p>
                    {tour.description && (
                      <p className="text-white/60 text-sm mt-2">
                        {tour.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Conference Overview</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Total Events</div>
              <div className="text-2xl font-bold text-white">{scheduleEvents.length}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Committee Meetings</div>
              <div className="text-2xl font-bold text-white">{committeeMeetings.length}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Facility Tours</div>
              <div className="text-2xl font-bold text-white">{facilityTours.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};