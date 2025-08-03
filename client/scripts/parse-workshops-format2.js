const fs = require('fs').promises;

/**
 * Parser specifically for Format 2 workshops
 * Format 2: Title with credits first, then Primary Community, inline Date/Time/Room
 */
class WorkshopFormat2Parser {
  constructor() {
    this.workshops = [];
    this.debugMode = false;
  }

  /**
   * Parse a text file containing Format 2 workshop data
   */
  async parseFile(filePath, debug = false) {
    this.debugMode = debug;
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split into workshop blocks using separator lines
    const blocks = this.splitIntoWorkshops(content);
    
    if (this.debugMode) {
      console.log(`Found ${blocks.length} potential workshop blocks\n`);
    }
    
    for (let i = 0; i < blocks.length; i++) {
      const workshop = this.parseWorkshopBlock(blocks[i], i);
      if (workshop && workshop.title) {
        this.workshops.push(workshop);
        
        if (this.debugMode) {
          console.log(`Workshop ${i + 1}: ${workshop.title.substring(0, 50)}...`);
          console.log(`  Date/Time: ${workshop.day || 'NO DAY'} ${workshop.date || 'NO DATE'} ${workshop.time_block || 'NO TIME'}`);
          console.log(`  Credits: ${workshop.credits || 'NO CREDITS'}`);
        }
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
      
      // Separator line indicates end of workshop
      if (line.match(/^_{5,}$/)) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }
      // Skip empty lines at the beginning of a block
      else if (line !== '' || currentBlock.length > 0) {
        currentBlock.push(line);
      }
    }
    
    // Don't forget the last block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  /**
   * Parse an individual Format 2 workshop block
   */
  parseWorkshopBlock(lines, blockIndex) {
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
    
    let lineIndex = 0;
    
    // Skip empty lines at the beginning
    while (lineIndex < lines.length && lines[lineIndex] === '') {
      lineIndex++;
    }
    
    // First non-empty line should be title with credits
    if (lineIndex < lines.length) {
      const titleLine = lines[lineIndex];
      const creditsMatch = titleLine.match(/^(.+?)\s*\[(.+?)\]$/);
      
      if (creditsMatch) {
        workshop.title = creditsMatch[1].trim();
        workshop.credits = creditsMatch[2].trim();
      } else {
        workshop.title = titleLine;
      }
      lineIndex++;
    }
    
    // Look for Primary Community
    for (let i = lineIndex; i < lines.length; i++) {
      if (lines[i].startsWith('Primary Community')) {
        workshop.primary_community = lines[i].replace(/Primary Community.*?:\s*/, '').trim();
        lineIndex = i + 1;
        break;
      }
    }
    
    // Look for Date/Time/Room line
    for (let i = lineIndex; i < lines.length; i++) {
      if (lines[i].startsWith('Date:')) {
        this.parseInlineDateTimeRoom(lines[i], workshop);
        lineIndex = i + 1;
        break;
      }
    }
    
    // Parse the rest of the content
    this.parseRemainingContent(lines.slice(lineIndex), workshop);
    
    // Validate we have minimum required data
    if (!workshop.title) {
      if (this.debugMode) {
        console.log(`Block ${blockIndex + 1} rejected: No title found`);
        console.log('First few lines:', lines.slice(0, 5));
      }
      return null;
    }
    
    return workshop;
  }

  /**
   * Parse inline date/time/room format
   */
  parseInlineDateTimeRoom(line, workshop) {
    // Format: Date: Saturday, August 23, 2025. Time: 1:00 pm – 2:30 pm Room: 105.
    
    // Extract date
    const dateMatch = line.match(/Date:\s*([^.]+)/);
    if (dateMatch) {
      const fullDate = dateMatch[1].trim();
      const dayMatch = fullDate.match(/^(\w+),/);
      if (dayMatch) {
        workshop.day = dayMatch[1];
        workshop.date = fullDate.replace(/^\w+,\s*/, '');
      } else {
        workshop.date = fullDate;
      }
    }
    
    // Extract time
    const timeMatch = line.match(/Time:\s*(\d{1,2}:\d{2}\s*(?:am|pm)\s*[–\-]\s*\d{1,2}:\d{2}\s*(?:am|pm))/i);
    if (timeMatch) {
      workshop.time_block = timeMatch[1].trim();
      const times = this.parseTimeBlock(workshop.time_block);
      workshop.start_time = times.start;
      workshop.end_time = times.end;
    }
    
    // Extract room
    const roomMatch = line.match(/Room:\s*([^.]+)/);
    if (roomMatch) {
      workshop.room = roomMatch[1].trim();
    }
  }

  /**
   * Parse remaining content (overview, speakers, etc.)
   */
  parseRemainingContent(lines, workshop) {
    let currentSection = null;
    let currentObjective = '';
    let objectiveNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line) continue;
      
      // Check section changes
      if (line.startsWith('Overview:')) {
        currentSection = 'overview';
        workshop.overview = line.replace('Overview:', '').trim();
      } 
      else if (line.startsWith('Learning Objectives:') || line.startsWith('Learning Objective:')) {
        currentSection = 'objectives';
        objectiveNumber = 0;
        // Check if objectives are on the same line
        const inline = line.replace(/Learning Objectives?:\s*/i, '').trim();
        if (inline && !inline.match(/^\d+\./)) {
          workshop.learning_objectives.push(inline);
        }
      } 
      else if (line.startsWith('Moderator:') || line.startsWith('Moderators:')) {
        // Save any pending objective
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = null;
        const moderatorText = line.replace(/Moderators?:/i, '').trim();
        const moderator = this.parsePerson(moderatorText);
        if (moderator) {
          workshop.moderators.push(moderator);
        }
      } 
      else if (/^Speaker\s*\d*:/.test(line)) {
        // Save any pending objective
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = null;
        const speakerText = line.replace(/^Speaker\s*\d*:\s*/i, '').trim();
        const speaker = this.parsePerson(speakerText);
        if (speaker) {
          workshop.speakers.push(speaker);
        }
      }
      // Continue current section
      else if (currentSection === 'overview' && !this.isMetadataLine(line)) {
        workshop.overview += ' ' + line;
      } 
      else if (currentSection === 'objectives') {
        // Check if it's a numbered objective
        const numberedMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (numberedMatch) {
          // Save previous objective if exists
          if (currentObjective) {
            workshop.learning_objectives.push(currentObjective.trim());
          }
          // Start new objective (without the number)
          currentObjective = numberedMatch[2].trim();
          objectiveNumber = parseInt(numberedMatch[1]);
        }
        // Continue current objective
        else if (currentObjective && !this.isMetadataLine(line)) {
          currentObjective += ' ' + line;
        }
      }
    }
    
    // Don't forget the last objective
    if (currentSection === 'objectives' && currentObjective) {
      workshop.learning_objectives.push(currentObjective.trim());
    }
  }

  /**
   * Check if line is metadata (not content)
   */
  isMetadataLine(line) {
    const metadataStarts = [
      'Overview:', 'Learning Objectives:', 'Learning Objective:', 
      'Moderator:', 'Moderators:', 'Speaker:', 'Speakers:',
      'Primary Community', 'Date:', 'Time:', 'Room:',
      'Credits:', 'CE:', 'CME:', 'CEU:'
    ];
    
    return metadataStarts.some(start => line.startsWith(start)) || 
           /^Speaker\s*\d+:/.test(line);
  }

  /**
   * Parse time block into start and end times
   */
  parseTimeBlock(timeBlock) {
    const match = timeBlock.match(/(\d{1,2}:\d{2})\s*(am|pm)\s*[–\-]\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
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
   * Parse person information
   */
  parsePerson(text) {
    const parts = text.split(',').map(p => p.trim());
    
    if (parts.length >= 1 && parts[0]) {
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
  async exportJSON(outputPath) {
    return fs.writeFile(outputPath, JSON.stringify(this.workshops, null, 2));
  }

  /**
   * Export workshops as CSV
   */
  async exportCSV(outputPath, append = false) {
    const headers = [
      'Title',
      'Date',
      'Time',
      'Room',
      'Overview',
      'Speakers',
      'Moderator',
      'Category',
      'CE_Credits',
      'Primary_Community',
      'Learning_Objectives'
    ];
    
    let rows = [];
    
    // Only add headers if not appending
    if (!append) {
      rows.push(headers.join(','));
    }
    
    for (const workshop of this.workshops) {
      // Format speakers
      const speakers = (workshop.speakers || []).map(s => {
        const parts = [s.name];
        if (s.title) parts.push(s.title);
        if (s.organization) parts.push(s.organization);
        if (s.location) parts.push(s.location);
        return parts.join(', ');
      }).join('; ');
      
      // Format moderators
      const moderators = (workshop.moderators || []).map(m => {
        const parts = [m.name];
        if (m.title) parts.push(m.title);
        if (m.organization) parts.push(m.organization);
        if (m.location) parts.push(m.location);
        return parts.join(', ');
      }).join('; ');
      
      // Format learning objectives
      const objectives = (workshop.learning_objectives || []).join('; ');
      
      // Combine date and day
      const fullDate = workshop.day && workshop.date ? 
        `${workshop.day}, ${workshop.date}` : 
        (workshop.date || '');
      
      const row = [
        this.escapeCSV(workshop.title),
        this.escapeCSV(fullDate),
        this.escapeCSV(workshop.time_block),
        this.escapeCSV(workshop.room ? `Room ${workshop.room}` : ''),
        this.escapeCSV(workshop.overview),
        this.escapeCSV(speakers),
        this.escapeCSV(moderators),
        this.escapeCSV(''), // Category
        this.escapeCSV(workshop.credits),
        this.escapeCSV(workshop.primary_community),
        this.escapeCSV(objectives)
      ];
      
      rows.push(row.join(','));
    }
    
    if (append) {
      // Read existing file and append
      try {
        const existing = await fs.readFile(outputPath, 'utf-8');
        return fs.writeFile(outputPath, existing + '\n' + rows.join('\n'));
      } catch (e) {
        // File doesn't exist, write with headers
        rows.unshift(headers.join(','));
        return fs.writeFile(outputPath, rows.join('\n'));
      }
    } else {
      return fs.writeFile(outputPath, rows.join('\n'));
    }
  }

  /**
   * Escape CSV field
   */
  escapeCSV(text) {
    if (!text) return '';
    // If contains comma, quote, or newline, wrap in quotes and escape inner quotes
    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes(';')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  /**
   * Get statistics about parsing
   */
  getStats() {
    const stats = {
      total: this.workshops.length,
      withDate: this.workshops.filter(w => w.date).length,
      withTime: this.workshops.filter(w => w.time_block).length,
      withRoom: this.workshops.filter(w => w.room).length,
      withSpeakers: this.workshops.filter(w => w.speakers.length > 0).length,
      withModerators: this.workshops.filter(w => w.moderators.length > 0).length,
      withCredits: this.workshops.filter(w => w.credits).length,
      withObjectives: this.workshops.filter(w => w.learning_objectives.length > 0).length
    };
    
    return stats;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node parse-workshops-format2.js <input.txt> [output.csv] [--append] [--debug]');
    console.log('Example: node parse-workshops-format2.js workshops2.txt workshops.csv --append');
    console.log('\nOptions:');
    console.log('  --append  Append to existing CSV file');
    console.log('  --debug   Show detailed parsing information');
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1] || 'workshops-format2.csv';
  const append = args.includes('--append');
  const debug = args.includes('--debug');
  
  try {
    const parser = new WorkshopFormat2Parser();
    const workshops = await parser.parseFile(inputPath, debug);
    
    console.log(`\n✅ Parsed ${workshops.length} workshops from Format 2`);
    
    // Show statistics
    const stats = parser.getStats();
    console.log('\n📊 Statistics:');
    console.log(`  With date: ${stats.withDate}/${stats.total}`);
    console.log(`  With time: ${stats.withTime}/${stats.total}`);
    console.log(`  With room: ${stats.withRoom}/${stats.total}`);
    console.log(`  With speakers: ${stats.withSpeakers}/${stats.total}`);
    console.log(`  With moderators: ${stats.withModerators}/${stats.total}`);
    console.log(`  With credits: ${stats.withCredits}/${stats.total}`);
    console.log(`  With objectives: ${stats.withObjectives}/${stats.total}`);
    
    // Save as JSON
    const jsonPath = outputPath.replace('.csv', '.json');
    await parser.exportJSON(jsonPath);
    console.log(`\n📁 Saved JSON to ${jsonPath}`);
    
    // Save as CSV
    await parser.exportCSV(outputPath, append);
    console.log(`📁 ${append ? 'Appended to' : 'Saved'} CSV: ${outputPath}`);
    
    // Show sample parsed workshops
    if (debug && workshops.length > 0) {
      console.log('\n📝 Sample parsed workshop:');
      const sample = workshops[0];
      console.log(`  Title: ${sample.title}`);
      console.log(`  Credits: ${sample.credits}`);
      console.log(`  Date/Time: ${sample.day}, ${sample.date} ${sample.time_block}`);
      console.log(`  Room: ${sample.room}`);
      console.log(`  Community: ${sample.primary_community}`);
      if (sample.learning_objectives.length > 0) {
        console.log(`  Objectives: ${sample.learning_objectives.length} found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = WorkshopFormat2Parser;

// Run if called directly
if (require.main === module) {
  main();
}