// Database-specific conference types with timestamps
export interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface EventSession {
  id: string;
  time: string;
  title: string;
  speaker: string;
  description?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}