const fs = require('fs').promises;

/**
 * Parse workshop data from text file with multiple formats
 */
class WorkshopParser {
  constructor() {
    this.workshops = [];
  }

  /**
   * Parse a text file containing workshop data
   */
  async parseFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split into potential workshop blocks
    // Look for patterns that indicate a new workshop
    const blocks = this.splitIntoWorkshops(content);
    
    for (const block of blocks) {
      const workshop = this.parseWorkshopBlock(block);
      if (workshop && workshop.title) {
        this.workshops.push(workshop);
      }
    }
    
    return this.workshops;
  }

  /**
   * Split content into individual workshop blocks
   */
  splitIntoWorkshops(content) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      
      // Detect start of new workshop
      if (this.isWorkshopStart(line, nextLine)) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
        }
        currentBlock = [line];
      } else if (line) {
        currentBlock.push(line);
      }
    }
    
    // Don't forget the last block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
    }
    
    return blocks;
  }

  /**
   * Check if a line indicates the start of a new workshop
   */
  isWorkshopStart(line, nextLine) {
    // Format 1: Day as first line (Monday, August 25, 2025)
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d{1,2},\s+\d{4}/.test(line)) {
      return true;
    }
    
    // Format 2: Title with credits [ΨCE|CE|CME|CEU]
    if (line.includes('[') && line.includes(']') && 
        (line.includes('CE') || line.includes('CME') || line.includes('CEU'))) {
      return true;
    }
    
    // Format 3: Check if line is likely a title (capitalize words, reasonable length)
    // and the block ahead contains Overview:
    // Don't trigger on Overview: itself or other metadata lines
    if (!line.startsWith('Overview:') && 
        !line.startsWith('Speaker') && 
        !line.startsWith('Moderator') &&
        !line.startsWith('Learning Objectives:') &&
        line.length > 20 && 
        line.length < 200) {
      // Could be a title - we'll verify in parseWorkshopBlock
      return false; // Let the block parser handle it
    }
    
    return false;
  }

  /**
   * Parse an individual workshop block
   */
  parseWorkshopBlock(block) {
    const workshop = {
      title: null,
      overview: null,
      day: null,
      date: null,
      start_time: null,
      end_time: null,
      time_block: null,
      room: null,
      primary_community: null,
      credits: null,
      learning_objectives: [],
      moderators: [],
      speakers: []
    };
    
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    
    // Try Format 1 (Day, Date at top)
    if (this.tryParseFormat1(lines, workshop)) {
      return workshop;
    }
    
    // Try Format 2 (Title with credits first)
    if (this.tryParseFormat2(lines, workshop)) {
      return workshop;
    }
    
    // Try generic parsing
    return this.tryGenericParse(lines, workshop);
  }

  /**
   * Parse Format 1: Monday, August 25, 2025 style
   */
  tryParseFormat1(lines, workshop) {
    let lineIndex = 0;
    
    // Check for date line
    if (lineIndex < lines.length && /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d{1,2},\s+\d{4}/.test(lines[lineIndex])) {
      const dateParts = lines[lineIndex].match(/^(\w+),\s+(.+)$/);
      if (dateParts) {
        workshop.day = dateParts[1];
        workshop.date = dateParts[2];
      }
      lineIndex++;
    }
    
    // Check for time line (8:00 am – 9:30 am)
    if (lineIndex < lines.length && /\d{1,2}:\d{2}\s*(am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(am|pm)/i.test(lines[lineIndex])) {
      workshop.time_block = lines[lineIndex];
      const times = this.parseTimeBlock(lines[lineIndex]);
      workshop.start_time = times.start;
      workshop.end_time = times.end;
      lineIndex++;
    }
    
    // Check for room
    if (lineIndex < lines.length && /^Room\s+\w+/i.test(lines[lineIndex])) {
      workshop.room = lines[lineIndex].replace(/^Room\s+/i, '');
      lineIndex++;
    }
    
    // Next line should be title
    if (lineIndex < lines.length) {
      workshop.title = lines[lineIndex];
      lineIndex++;
    }
    
    // Parse the rest
    this.parseCommonElements(lines.slice(lineIndex), workshop);
    
    return workshop.title !== null;
  }

  /**
   * Parse Format 2: Title [Credits] style
   */
  tryParseFormat2(lines, workshop) {
    let lineIndex = 0;
    
    // Check for title with credits
    if (lineIndex < lines.length && lines[lineIndex].includes('[') && lines[lineIndex].includes(']')) {
      const titleMatch = lines[lineIndex].match(/^(.+?)\s*\[(.+?)\]$/);
      if (titleMatch) {
        workshop.title = titleMatch[1].trim();
        workshop.credits = titleMatch[2].trim();
      }
      lineIndex++;
    }
    
    // Look for Primary Community
    for (let i = lineIndex; i < lines.length; i++) {
      if (lines[i].startsWith('Primary Community of Focus:')) {
        workshop.primary_community = lines[i].replace('Primary Community of Focus:', '').trim();
        break;
      }
    }
    
    // Look for Date/Time/Room
    for (let i = lineIndex; i < lines.length; i++) {
      if (lines[i].startsWith('Date:')) {
        const dateTimeRoom = lines[i];
        
        // Extract date
        const dateMatch = dateTimeRoom.match(/Date:\s*([^.]+)/);
        if (dateMatch) {
          const fullDate = dateMatch[1].trim();
          const dayMatch = fullDate.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
          if (dayMatch) {
            workshop.day = dayMatch[1];
          }
          workshop.date = fullDate;
        }
        
        // Extract time
        const timeMatch = dateTimeRoom.match(/Time:\s*([^R]+)/);
        if (timeMatch) {
          workshop.time_block = timeMatch[1].trim();
          const times = this.parseTimeBlock(workshop.time_block);
          workshop.start_time = times.start;
          workshop.end_time = times.end;
        }
        
        // Extract room
        const roomMatch = dateTimeRoom.match(/Room:\s*(.+)/);
        if (roomMatch) {
          workshop.room = roomMatch[1].trim().replace(/\.$/, '');
        }
        
        break;
      }
    }
    
    // Parse the rest
    this.parseCommonElements(lines.slice(lineIndex), workshop);
    
    return workshop.title !== null;
  }

  /**
   * Generic parsing fallback
   */
  tryGenericParse(lines, workshop) {
    // Assume first substantial line is title
    for (const line of lines) {
      if (line.length > 20 && !line.startsWith('Overview:') && !line.startsWith('Learning Objectives:')) {
        workshop.title = line.replace(/\[.+?\]$/, '').trim();
        const creditsMatch = line.match(/\[(.+?)\]$/);
        if (creditsMatch) {
          workshop.credits = creditsMatch[1];
        }
        break;
      }
    }
    
    this.parseCommonElements(lines, workshop);
    return workshop.title !== null;
  }

  /**
   * Parse common elements like overview, speakers, etc.
   */
  parseCommonElements(lines, workshop) {
    let inOverview = false;
    let inLearningObjectives = false;
    let currentObjective = '';
    
    for (const line of lines) {
      // Overview
      if (line.startsWith('Overview:')) {
        inOverview = true;
        workshop.overview = line.replace('Overview:', '').trim();
        continue;
      }
      
      // Learning Objectives
      if (line.startsWith('Learning Objectives:')) {
        inOverview = false;
        inLearningObjectives = true;
        continue;
      }
      
      // Moderator
      if (line.startsWith('Moderator:')) {
        inOverview = false;
        inLearningObjectives = false;
        const moderator = this.parsePerson(line.replace('Moderator:', '').trim());
        if (moderator) workshop.moderators.push(moderator);
        continue;
      }
      
      // Speaker
      if (/^Speaker\s*\d*:/.test(line)) {
        inOverview = false;
        inLearningObjectives = false;
        const speaker = this.parsePerson(line.replace(/^Speaker\s*\d*:/, '').trim());
        if (speaker) workshop.speakers.push(speaker);
        continue;
      }
      
      // Continue overview
      if (inOverview && !line.startsWith('Learning Objectives:') && !line.startsWith('Moderator:')) {
        workshop.overview += ' ' + line;
      }
      
      // Learning objectives
      if (inLearningObjectives) {
        if (line.match(/^[•\-\*]/) || line.match(/^\d+\./)) {
          if (currentObjective) {
            workshop.learning_objectives.push(currentObjective.trim());
          }
          currentObjective = line.replace(/^[•\-\*\d+\.]\s*/, '');
        } else if (!line.startsWith('Moderator:') && !line.startsWith('Speaker')) {
          currentObjective += ' ' + line;
        }
      }
    }
    
    // Don't forget the last objective
    if (currentObjective) {
      workshop.learning_objectives.push(currentObjective.trim());
    }
  }

  /**
   * Parse time block into start and end times
   */
  parseTimeBlock(timeBlock) {
    const match = timeBlock.match(/(\d{1,2}:\d{2})\s*(am|pm)\s*[–-]\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
    if (match) {
      return {
        start: this.convertTo24Hour(match[1], match[2]),
        end: this.convertTo24Hour(match[3], match[4])
      };
    }
    return { start: null, end: null };
  }

  /**
   * Convert 12-hour time to 24-hour format
   */
  convertTo24Hour(time, ampm) {
    let [hours, minutes] = time.split(':').map(Number);
    
    if (ampm.toLowerCase() === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  /**
   * Parse person information (name, title, organization, location)
   */
  parsePerson(text) {
    // Format: Name, Title, Organization, Location
    const parts = text.split(',').map(p => p.trim());
    
    if (parts.length >= 1) {
      return {
        name: parts[0],
        title: parts[1] || null,
        organization: parts[2] || null,
        location: parts[3] || null
      };
    }
    
    return null;
  }

  /**
   * Export workshops as JSON
   */
  exportJSON(outputPath) {
    return fs.writeFile(outputPath, JSON.stringify(this.workshops, null, 2));
  }

  /**
   * Export workshops as CSV
   */
  async exportCSV(outputPath) {
    const headers = [
      'title', 'day', 'date', 'start_time', 'end_time', 'room',
      'primary_community', 'credits', 'overview', 'speakers_count'
    ];
    
    const rows = [headers.join(',')];
    
    for (const workshop of this.workshops) {
      const row = [
        this.escapeCSV(workshop.title),
        this.escapeCSV(workshop.day),
        this.escapeCSV(workshop.date),
        workshop.start_time || '',
        workshop.end_time || '',
        this.escapeCSV(workshop.room),
        this.escapeCSV(workshop.primary_community),
        this.escapeCSV(workshop.credits),
        this.escapeCSV(workshop.overview),
        workshop.speakers.length
      ];
      rows.push(row.join(','));
    }
    
    return fs.writeFile(outputPath, rows.join('\n'));
  }

  escapeCSV(text) {
    if (!text) return '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node parse-workshops-text.js <input.txt> [output.json]');
    console.log('Example: node parse-workshops-text.js workshops.txt workshops.json');
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1] || 'workshops.json';
  
  try {
    const parser = new WorkshopParser();
    const workshops = await parser.parseFile(inputPath);
    
    console.log(`✅ Parsed ${workshops.length} workshops`);
    
    // Save as JSON
    await parser.exportJSON(outputPath);
    console.log(`📁 Saved to ${outputPath}`);
    
    // Also save as CSV
    const csvPath = outputPath.replace('.json', '.csv');
    await parser.exportCSV(csvPath);
    console.log(`📁 Also saved as ${csvPath}`);
    
    // Show sample
    console.log('\nSample workshop:');
    console.log(JSON.stringify(workshops[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = WorkshopParser;

// Run if called directly
if (require.main === module) {
  main();
}