export interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  image?: string;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  time: string;
  speaker: string;
  location?: string;
  type?: string;
}

export interface ConferenceData {
  speakers: Speaker[];
  sessions: Session[];
  lastFetched: number;
}