const fs = require('fs').promises;

/**
 * Improved workshop parser that better handles date/time extraction
 */
class ImprovedWorkshopParser {
  constructor() {
    this.workshops = [];
    this.debugMode = false;
  }

  /**
   * Parse a text file containing workshop data
   */
  async parseFile(filePath, debug = false) {
    this.debugMode = debug;
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split into workshop blocks more intelligently
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
    let inWorkshop = false;
    let lastWasEmpty = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isDateLine = this.isDateLine(line);
      
      // Start new block on date line
      if (isDateLine) {
        // Save previous block if exists
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = [line];
        inWorkshop = true;
        lastWasEmpty = false;
      }
      // Check for title with credits pattern (alternative format)
      else if (this.isTitleWithCredits(line)) {
        // Save previous block if exists
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = [line];
        inWorkshop = true;
        lastWasEmpty = false;
      }
      // Empty line might indicate end of workshop
      else if (line === '') {
        if (inWorkshop && lastWasEmpty) {
          // Two empty lines in a row - probably end of workshop
          if (currentBlock.length > 0) {
            blocks.push(currentBlock);
            currentBlock = [];
            inWorkshop = false;
          }
        }
        lastWasEmpty = true;
      }
      // Regular content line
      else {
        currentBlock.push(line);
        lastWasEmpty = false;
      }
    }
    
    // Don't forget the last block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  /**
   * Check if line is a date line
   */
  isDateLine(line) {
    return /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d{1,2},\s+\d{4}/.test(line);
  }

  /**
   * Check if line is a title with credits
   */
  isTitleWithCredits(line) {
    return line.includes('[') && line.includes(']') && 
           (line.includes('CE') || line.includes('CME') || line.includes('CEU'));
  }

  /**
   * Parse an individual workshop block
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
    let foundDateInfo = false;
    
    // Look for date line first (Monday, August 25, 2025)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (this.isDateLine(lines[i])) {
        const match = lines[i].match(/^(\w+),\s+(.+)$/);
        if (match) {
          workshop.day = match[1];
          workshop.date = match[2];
          foundDateInfo = true;
        }
        lineIndex = i + 1;
        break;
      }
    }
    
    // Look for time line (should be right after date)
    if (foundDateInfo && lineIndex < lines.length) {
      const timeLine = lines[lineIndex];
      if (this.isTimeLine(timeLine)) {
        workshop.time_block = timeLine;
        const times = this.parseTimeBlock(timeLine);
        workshop.start_time = times.start;
        workshop.end_time = times.end;
        lineIndex++;
      }
    }
    
    // Look for room line
    if (lineIndex < lines.length && this.isRoomLine(lines[lineIndex])) {
      workshop.room = lines[lineIndex].replace(/^Room\s+/i, '').trim();
      lineIndex++;
    }
    
    // Next substantial line should be the title
    for (let i = lineIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line || line.length === 0) {
        continue;
      }
      
      // Skip if it's metadata - IMPORTANT CHECK
      if (this.isMetadataLine(line)) {
        // If we hit metadata before finding a title, there might be a problem
        if (this.debugMode) {
          console.log(`  Warning: Hit metadata "${line.substring(0, 30)}..." before finding title`);
        }
        continue;
      }
      
      // Skip lines that are obviously not titles
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || 
          line.match(/^\d+\./)) {
        // Bullet points or numbered lists
        continue;
      }
      
      // This should be the title
      if (line.length > 10) {
        // Check for credits in title
        const creditsMatch = line.match(/^(.+?)\s*\[(.+?)\]$/);
        if (creditsMatch) {
          workshop.title = creditsMatch[1].trim();
          workshop.credits = creditsMatch[2].trim();
        } else {
          workshop.title = line;
        }
        lineIndex = i + 1;
        break;
      }
    }
    
    // If we didn't find date info in standard format, check for inline format
    if (!foundDateInfo) {
      for (let i = lineIndex; i < lines.length; i++) {
        if (lines[i].startsWith('Date:')) {
          this.parseInlineDateTimeRoom(lines[i], workshop);
          foundDateInfo = true;
          break;
        }
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
   * Check if line is a time line
   */
  isTimeLine(line) {
    return /\d{1,2}:\d{2}\s*(am|pm)\s*[–\-]\s*\d{1,2}:\d{2}\s*(am|pm)/i.test(line);
  }

  /**
   * Check if line is a room line
   */
  isRoomLine(line) {
    return /^Room\s+\w+/i.test(line);
  }

  /**
   * Check if line is metadata (not a title)
   */
  isMetadataLine(line) {
    const metadataStarts = [
      'Overview:', 'Learning Objectives:', 'Learning Objective:', 
      'Moderator:', 'Moderators:', 'Speaker:', 'Speakers:',
      'Primary Community', 'Date:', 'Time:', 'Room:',
      'Credits:', 'CE:', 'CME:', 'CEU:'
    ];
    
    // Check if line starts with any metadata keyword
    return metadataStarts.some(start => line.startsWith(start)) || 
           /^Speaker\s*\d+:/.test(line); // Also check for "Speaker 1:", "Speaker 2:", etc.
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
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // Check section changes
      if (line.startsWith('Overview:')) {
        // Save any pending objective
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = 'overview';
        workshop.overview = line.replace('Overview:', '').trim();
      } 
      else if (line.startsWith('Primary Community')) {
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = null;
        workshop.primary_community = line.replace(/Primary Community.*?:\s*/, '').trim();
      } 
      else if (line.startsWith('Learning Objectives:') || line.startsWith('Learning Objective:')) {
        currentSection = 'objectives';
        // Check if objectives are on the same line
        const inline = line.replace(/Learning Objectives?:\s*/i, '').trim();
        if (inline) {
          workshop.learning_objectives.push(inline);
        }
      } 
      else if (line.startsWith('Moderator:') || line.startsWith('Moderators:')) {
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = null;
        const moderatorText = line.replace(/Moderators?:/i, '').trim();
        // Handle multiple moderators separated by semicolon
        const moderators = moderatorText.split(';').map(m => this.parsePerson(m.trim())).filter(m => m);
        workshop.moderators.push(...moderators);
      } 
      else if (/^Speakers?:/.test(line) || /^Speaker\s*\d*:/.test(line)) {
        if (currentSection === 'objectives' && currentObjective) {
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        currentSection = null;
        const speakerText = line.replace(/^Speakers?:?\s*\d*:?/i, '').trim();
        // Handle multiple speakers separated by semicolon
        const speakers = speakerText.split(';').map(s => this.parsePerson(s.trim())).filter(s => s);
        workshop.speakers.push(...speakers);
      }
      // Continue current section
      else if (currentSection === 'overview') {
        // Check if this is a bullet point (which means objectives are starting)
        if (line.match(/^[•\-\*]/) || line.match(/^\d+\./)) {
          currentSection = 'objectives';
          currentObjective = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
        } else if (!this.isMetadataLine(line)) {
          workshop.overview += ' ' + line;
        }
      } 
      else if (currentSection === 'objectives') {
        // Check if it's a new bullet point
        if (line.match(/^[•\-\*]/) || line.match(/^\d+\./)) {
          // Save previous objective if exists
          if (currentObjective) {
            workshop.learning_objectives.push(currentObjective.trim());
          }
          // Start new objective
          currentObjective = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
        } 
        // Check if next line looks like a new section
        else if (nextLine && this.isMetadataLine(nextLine)) {
          // This line completes the current objective
          if (currentObjective) {
            currentObjective += ' ' + line;
          } else {
            currentObjective = line;
          }
          workshop.learning_objectives.push(currentObjective.trim());
          currentObjective = '';
        }
        // Otherwise continue the current objective
        else if (line && !this.isMetadataLine(line)) {
          if (currentObjective) {
            currentObjective += ' ' + line;
          } else {
            currentObjective = line;
          }
        }
      }
    }
    
    // Don't forget the last objective
    if (currentSection === 'objectives' && currentObjective) {
      workshop.learning_objectives.push(currentObjective.trim());
    }
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
  async exportCSV(outputPath) {
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
    
    const rows = [headers.join(',')];
    
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
        this.escapeCSV(''), // Category - you can set this based on keywords if needed
        this.escapeCSV(workshop.credits),
        this.escapeCSV(workshop.primary_community),
        this.escapeCSV(objectives)
      ];
      
      rows.push(row.join(','));
    }
    
    return fs.writeFile(outputPath, rows.join('\n'));
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
      withCredits: this.workshops.filter(w => w.credits).length
    };
    
    return stats;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node parse-workshops-improved.js <input.txt> [output.json] [--debug]');
    console.log('Example: node parse-workshops-improved.js workshops.txt workshops.json --debug');
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1] || 'workshops.json';
  const debug = args.includes('--debug');
  
  try {
    const parser = new ImprovedWorkshopParser();
    const workshops = await parser.parseFile(inputPath, debug);
    
    console.log(`\n✅ Parsed ${workshops.length} workshops`);
    
    // Show statistics
    const stats = parser.getStats();
    console.log('\n📊 Statistics:');
    console.log(`  With date: ${stats.withDate}/${stats.total}`);
    console.log(`  With time: ${stats.withTime}/${stats.total}`);
    console.log(`  With room: ${stats.withRoom}/${stats.total}`);
    console.log(`  With speakers: ${stats.withSpeakers}/${stats.total}`);
    console.log(`  With credits: ${stats.withCredits}/${stats.total}`);
    
    // Save as JSON
    await parser.exportJSON(outputPath);
    console.log(`\n📁 Saved JSON to ${outputPath}`);
    
    // Also save as CSV
    const csvPath = outputPath.replace('.json', '.csv');
    await parser.exportCSV(csvPath);
    console.log(`📁 Saved CSV to ${csvPath}`);
    
    // Show workshops missing date/time
    const missingDateTime = workshops.filter(w => !w.date || !w.time_block);
    if (missingDateTime.length > 0) {
      console.log('\n⚠️  Workshops missing date/time:');
      missingDateTime.forEach(w => {
        console.log(`  - ${w.title.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = ImprovedWorkshopParser;

// Run if called directly
if (require.main === module) {
  main();
}