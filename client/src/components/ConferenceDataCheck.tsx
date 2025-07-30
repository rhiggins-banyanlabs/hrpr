// src/components/ConferenceDataCheck.tsx
"use client"
import { useState } from 'react';
import { ConferenceStorageService, Speaker, EventSession } from '@/lib/supabase/chatStorage';

interface ConferenceData {
  speakers: Speaker[];
  sessions: EventSession[];
  speakerCount: number;
  sessionCount: number;
  error?: string;
}

export function ConferenceDataCheck() {
  const [data, setData] = useState<ConferenceData | null>(null);
  const [loading, setLoading] = useState(false);

  const checkData = async () => {
    setLoading(true);
    try {
      const [speakers, sessions] = await Promise.all([
        ConferenceStorageService.getAllSpeakers(),
        ConferenceStorageService.getAllSessions()
      ]);
      
      setData({
        speakers,
        sessions,
        speakerCount: speakers.length,
        sessionCount: sessions.length
      });
      
      console.log('📊 Conference Data Check:', {
        speakers,
        sessions,
        speakerCount: speakers.length,
        sessionCount: sessions.length
      });
      
    } catch (error) {
      console.error('❌ Error checking conference data:', error);
      setData({ error: (error as Error).message, speakers: [], sessions: [], speakerCount: 0, sessionCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 w-80 max-h-80 bg-black/90 text-white p-4 rounded-lg border border-yellow-600 z-50 overflow-auto">
      <h3 className="text-lg font-bold mb-2 text-yellow-400">🔍 Conference Data Check</h3>
      
      <button
        onClick={checkData}
        disabled={loading}
        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded text-sm mb-3"
      >
        {loading ? "Checking..." : "Check Database"}
      </button>

      {data && (
        <div className="text-xs font-mono space-y-2">
          {data.error ? (
            <div className="text-red-400">Error: {data.error}</div>
          ) : (
            <>
              <div className="text-green-400">
                ✅ Speakers: {data.speakerCount} found
              </div>
              <div className="text-green-400">
                ✅ Sessions: {data.sessionCount} found
              </div>
              
              {data.speakers.length > 0 && (
                <div>
                  <div className="text-yellow-400 font-bold">Speakers:</div>
                  {data.speakers.slice(0, 3).map((speaker: Speaker, i: number) => (
                    <div key={i} className="text-gray-300">
                      • {speaker.name} - {speaker.title}
                    </div>
                  ))}
                </div>
              )}
              
              {data.sessions.length > 0 && (
                <div>
                  <div className="text-yellow-400 font-bold">Sessions:</div>
                  {data.sessions.slice(0, 3).map((session: EventSession, i: number) => (
                    <div key={i} className="text-gray-300">
                      • {session.time}: {session.title}
                    </div>
                  ))}
                </div>
              )}
              
              {data.speakers.length === 0 && data.sessions.length === 0 && (
                <div className="text-red-400">
                  ❌ No conference data found in database!
                  <br />Add speakers and sessions in the admin panel.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}