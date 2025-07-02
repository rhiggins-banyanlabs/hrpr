import { Speaker, Session, ConferenceData } from '@/types/conference.types';
import { ConferenceStorageService } from '@/lib/supabase/chatStorage';
import { LoggerService } from '../logger.service';

export class ConferenceDataService {
  private logger: LoggerService;
  private speakers: Speaker[] = [];
  private sessions: Session[] = [];
  private lastDataFetch: number = 0;
  private readonly dataFreshDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.logger = new LoggerService();
  }

  /**
   * Ensure conference data is fresh and available
   */
  async ensureConferenceData(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastDataFetch < this.dataFreshDuration && this.speakers.length > 0) {
      return;
    }

    try {
      console.log('🔄 Fetching fresh conference data...');
      
      const [speakersResult, sessionsResult] = await Promise.all([
        ConferenceStorageService.getAllSpeakers(),
        ConferenceStorageService.getAllSessions()
      ]);

      this.speakers = speakersResult || [];
      this.sessions = sessionsResult || [];
      this.lastDataFetch = now;

      console.log(`✅ Conference data loaded: ${this.speakers.length} speakers, ${this.sessions.length} sessions`);
      
      if (this.sessions.length > 0) {
        console.log('🔍 First session data:', JSON.stringify(this.sessions[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error fetching conference data:', error);
      this.speakers = [];
      this.sessions = [];
    }
  }

  /**
   * Get all conference data
   */
  async getConferenceData(): Promise<ConferenceData> {
    await this.ensureConferenceData();
    
    return {
      speakers: this.speakers,
      sessions: this.sessions,
      lastFetched: this.lastDataFetch
    };
  }

  /**
   * Get speakers data
   */
  async getSpeakers(): Promise<Speaker[]> {
    await this.ensureConferenceData();
    return this.speakers;
  }

  /**
   * Get sessions data
   */
  async getSessions(): Promise<Session[]> {
    await this.ensureConferenceData();
    return this.sessions;
  }

  /**
   * Format conference data for AI prompt
   */
  async formatConferenceDataForPrompt(): Promise<string> {
    await this.ensureConferenceData();

    if (this.speakers.length === 0 && this.sessions.length === 0) {
      return '';
    }

    let conferenceInfo = '\n\nCONFERENCE INFORMATION:';
    
    if (this.speakers.length > 0) {
      conferenceInfo += '\nSPEAKERS:';
      this.speakers.forEach(speaker => {
        conferenceInfo += `\n- ${speaker.name} (${speaker.title}${speaker.company ? ` at ${speaker.company}` : ''})`;
      });
    }
    
    if (this.sessions.length > 0) {
      conferenceInfo += '\n\nSCHEDULE:';
      this.sessions.forEach(session => {
        const startTime = this.formatSessionTime(session.time);
        conferenceInfo += `\n- ${startTime}: ${session.title} by ${session.speaker}${session.location ? ` in ${session.location}` : ''}`;
      });
    }

    return conferenceInfo;
  }

  /**
   * Format session time for display
   */
  private formatSessionTime(timeString: string): string {
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else {
        return timeString || 'Unknown Time';
      }
    } catch (error) {
      console.error('❌ Error parsing session time:', error);
      return timeString || 'Unknown Time';
    }
  }

  /**
   * Refresh conference data manually
   */
  async refreshConferenceData(): Promise<void> {
    this.lastDataFetch = 0; // Force refresh
    await this.ensureConferenceData();
  }

  /**
   * Get data status information
   */
  getDataStatus(): { 
    lastFetched: number; 
    isStale: boolean; 
    speakerCount: number; 
    sessionCount: number; 
  } {
    const now = Date.now();
    const isStale = now - this.lastDataFetch > this.dataFreshDuration;
    
    return {
      lastFetched: this.lastDataFetch,
      isStale,
      speakerCount: this.speakers.length,
      sessionCount: this.sessions.length
    };
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.speakers = [];
    this.sessions = [];
    this.lastDataFetch = 0;
  }
}

export const conferenceDataService = new ConferenceDataService();
export default conferenceDataService;