// src/services/conference-data.service.ts
import { ConferenceStorageService } from '@/lib/supabase/chatStorage';
import { Speaker, Session } from '@/types/conference.types';

export class ConferenceDataService {
  private speakers: Speaker[] = [];
  private sessions: Session[] = [];
  private lastDataFetch: number = 0;
  private readonly dataFreshDuration: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch fresh conference data from Supabase
   */
  async ensureConferenceData(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastDataFetch < this.dataFreshDuration && this.speakers.length > 0) {
      return;
    }

    try {
      console.log('🔄 Fetching fresh conference data for AI routing...');
      
      const [speakersResult, sessionsResult] = await Promise.all([
        ConferenceStorageService.getAllSpeakers(),
        ConferenceStorageService.getAllSessions()
      ]);

      this.speakers = speakersResult || [];
      this.sessions = sessionsResult || [];
      this.lastDataFetch = now;

      console.log(`✅ Conference Data Service loaded ${this.speakers.length} speakers and ${this.sessions.length} sessions`);
      
      // Debug: Show first session data
      if (this.sessions.length > 0) {
        console.log('🔍 First session data:', JSON.stringify(this.sessions[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error fetching conference data:', error);
      this.speakers = [];
      this.sessions = [];
    }
  }

  getSpeakers(): Speaker[] {
    return this.speakers;
  }

  getSessions(): Session[] {
    return this.sessions;
  }

  getSpeakerCount(): number {
    return this.speakers.length;
  }

  getSessionCount(): number {
    return this.sessions.length;
  }

  getDataStatus() {
    return {
      speakers: this.speakers.length,
      sessions: this.sessions.length,
      lastFetch: new Date(this.lastDataFetch).toISOString(),
      dataAge: Date.now() - this.lastDataFetch,
      isStale: (Date.now() - this.lastDataFetch) > this.dataFreshDuration
    };
  }

  async refreshConferenceData(): Promise<void> {
    this.lastDataFetch = 0;
    await this.ensureConferenceData();
    console.log('🔄 Conference data refreshed in Conference Data Service');
  }

  getFirstSession(): Session | null {
    if (this.sessions.length === 0) return null;
    
    return this.sessions.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )[0];
  }
}