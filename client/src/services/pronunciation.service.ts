/**
 * Service to handle pronunciation corrections for text-to-speech
 * Ensures proper pronunciation of company names and technical terms
 */
class PronunciationService {
  private pronunciationMap: Record<string, string> = {
    // Company names
    'Vant4ge': 'Vantage',
    'vant4ge': 'vantage',
    'VANT4GE': 'VANTAGE',
    
    // Other common mispronunciations
    'ACA': 'A C A',  // Spell out the acronym
    'MOUD': 'M O U D',  // Medication for Opioid Use Disorder
    'PbS': 'P B S',  // Performance-based Standards
    'CERT': 'SERT',  // Correctional Emergency Response Team
    'CC': 'Convention Center',
    'HR': 'Hyatt Regency',
    
    // Technical terms
    'AI': 'A I',
    'VR': 'V R',
    'IoT': 'I O T',
    'API': 'A P I',
    
    // Room numbers with slashes (convert to "and")
    '3/4': '3 and 4',
    '108/110/112': '108, 110, and 112',
    '201/203': '201 and 203',
    '208/210/212': '208, 210, and 212',
    '301/302': '301 and 302',
    '401/402/403/404': '401, 402, 403, and 404',
    '405/406/407': '405, 406, and 407',
    '506/507': '506 and 507',
    
    // Times (ensure proper pronunciation)
    '12:00 PM': 'twelve noon',
    '12:00 AM': 'midnight',
    '12:30 PM': 'twelve thirty P M',
    '12:30 AM': 'twelve thirty A M'
  };

  /**
   * Apply pronunciation corrections to text before sending to TTS
   */
  correctPronunciation(text: string): string {
    let correctedText = text;
    
    // Apply all pronunciation corrections
    Object.entries(this.pronunciationMap).forEach(([original, replacement]) => {
      // Use word boundary regex to avoid partial matches
      const regex = new RegExp(`\\b${this.escapeRegex(original)}\\b`, 'gi');
      correctedText = correctedText.replace(regex, replacement);
    });
    
    // Handle special cases
    correctedText = this.handleSpecialCases(correctedText);
    
    return correctedText;
  }

  /**
   * Handle special pronunciation cases that need more complex logic
   */
  private handleSpecialCases(text: string): string {
    // Convert email addresses to more readable format
    text = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, 
      (match, local, domain) => {
        const domainParts = domain.split('.');
        return `${local} at ${domainParts.join(' dot ')}`;
      });
    
    // Convert URLs to more readable format
    text = text.replace(/https?:\/\/(www\.)?/g, '');
    text = text.replace(/\.com\b/g, ' dot com');
    text = text.replace(/\.org\b/g, ' dot org');
    text = text.replace(/\.gov\b/g, ' dot gov');
    
    // Handle phone numbers (make them more readable)
    text = text.replace(/(\d{3})-(\d{3})-(\d{4})/g, '$1, $2, $3');
    
    // Handle ampersands
    text = text.replace(/&/g, ' and ');
    
    // Handle common abbreviations
    text = text.replace(/\bDr\./g, 'Doctor');
    text = text.replace(/\bSt\./g, 'Street');
    text = text.replace(/\bAve\./g, 'Avenue');
    text = text.replace(/\bBlvd\./g, 'Boulevard');
    
    return text;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Add a custom pronunciation correction
   */
  addPronunciation(original: string, replacement: string): void {
    this.pronunciationMap[original] = replacement;
  }

  /**
   * Remove a pronunciation correction
   */
  removePronunciation(original: string): void {
    delete this.pronunciationMap[original];
  }

  /**
   * Get all current pronunciation corrections
   */
  getPronunciations(): Record<string, string> {
    return { ...this.pronunciationMap };
  }
}

export const pronunciationService = new PronunciationService();