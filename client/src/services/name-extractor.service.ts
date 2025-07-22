// Service to extract and track user names from conversations

export interface UserNameInfo {
  name: string | null;
  confidence: 'high' | 'medium' | 'low';
  extractedFrom: string; // The text it was extracted from
}

export class NameExtractorService {
  private static readonly NAME_PATTERNS = [
    // Direct introductions - capture first name only
    /(?:I'm|I am|My name is|This is|Call me)\s+([A-Z][a-z]+)/i,
    // Hi/Hello patterns - capture first name only
    /(?:Hi|Hello|Hey),?\s+(?:I'm|I am)\s+([A-Z][a-z]+)/i,
    // Simple name drop at start
    /^([A-Z][a-z]+)(?:\s+[A-Z][a-z]+)?\s*[,.!]?\s*$/,
  ];

  private static readonly COMMON_WORDS = new Set([
    'hi', 'hello', 'hey', 'thanks', 'thank', 'you', 'yes', 'no', 'ok', 'okay',
    'good', 'great', 'awesome', 'nice', 'well', 'fine', 'sure', 'please',
    'conference', 'session', 'speaker', 'keynote', 'schedule', 'time', 'when',
    'where', 'what', 'how', 'why', 'who', 'can', 'could', 'would', 'should', 'will',
    'harper', 'help', 'assist', 'question', 'about', 'information', 'tell',
    'show', 'find', 'looking', 'need', 'want', 'like', 'know', 'understand'
  ]);

  static extractName(text: string): UserNameInfo {
    if (!text || text.trim().length === 0) {
      return { name: null, confidence: 'low', extractedFrom: text };
    }

    const cleanText = text.trim();
    console.log('🔍 Extracting name from:', cleanText);

    // Try each pattern
    for (const pattern of this.NAME_PATTERNS) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const potentialName = match[1].trim();
        
        // Validate the extracted name
        if (this.isValidName(potentialName)) {
          const confidence = this.calculateConfidence(cleanText, potentialName, pattern);
          console.log('✅ Name extracted:', potentialName, 'confidence:', confidence);
          return {
            name: this.formatName(potentialName),
            confidence,
            extractedFrom: cleanText
          };
        }
      }
    }

    console.log('❌ No name extracted from text');
    return { name: null, confidence: 'low', extractedFrom: cleanText };
  }

  private static isValidName(name: string): boolean {
    // Check if it's not a common word
    if (this.COMMON_WORDS.has(name.toLowerCase())) {
      return false;
    }

    // Must be 2-20 characters, start with capital letter
    if (name.length < 2 || name.length > 20) {
      return false;
    }

    // Must start with capital letter and contain only letters and spaces
    if (!/^[A-Z][a-zA-Z\s]*$/.test(name)) {
      return false;
    }

    // Avoid obvious non-names
    const lowerName = name.toLowerCase();
    const nonNames = ['good', 'great', 'nice', 'well', 'fine', 'ok', 'okay', 'yes', 'no'];
    if (nonNames.includes(lowerName)) {
      return false;
    }

    return true;
  }

  private static calculateConfidence(
    fullText: string, 
    extractedName: string, 
    pattern: RegExp
  ): 'high' | 'medium' | 'low' {
    const lowerText = fullText.toLowerCase();
    
    // High confidence patterns
    if (lowerText.includes("i'm ") || 
        lowerText.includes("i am ") || 
        lowerText.includes("my name is") ||
        lowerText.includes("call me")) {
      return 'high';
    }

    // Medium confidence - simple greetings with names
    if ((lowerText.startsWith('hi ') || 
         lowerText.startsWith('hello ') ||
         lowerText.startsWith('hey ')) && 
        extractedName.length >= 3) {
      return 'medium';
    }

    // Check if it's a very short response (likely just a name)
    if (fullText.trim().split(/\s+/).length <= 2 && extractedName.length >= 3) {
      return 'medium';
    }

    return 'low';
  }

  private static formatName(name: string): string {
    // Capitalize first letter of each word
    return name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Check if a response looks like it might contain a name
  static containsPotentialName(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    
    const cleanText = text.trim();
    
    // Look for name introduction patterns
    const nameIntroPatterns = [
      /(?:I'm|I am|My name is|This is|Call me)\s+[A-Z]/i,
      /^(?:Hi|Hello|Hey),?\s+(?:I'm|I am)\s+[A-Z]/i,
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*[,.!]?\s*$/
    ];

    return nameIntroPatterns.some(pattern => pattern.test(cleanText));
  }
}