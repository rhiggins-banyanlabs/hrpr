const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// OpenAI client setup
const OpenAI = require('openai');

class CSVParser {
  constructor(delimiter = ',') {
    this.delimiter = delimiter;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === this.delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  normalizeHeaders(headers) {
    return headers.map(header => 
      header
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );
  }

  async parseFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content);
  }

  parseContent(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headerLine = lines[0];
    const rawHeaders = this.parseCSVLine(headerLine);
    const headers = this.normalizeHeaders(rawHeaders);
    
    console.log('Raw headers:', rawHeaders);
    console.log('Normalized headers:', headers);
    
    const exhibitors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const exhibitor = {};

      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          exhibitor[header] = values[index];
        }
      });

      // Map your specific CSV columns to our standard fields
      const mappedExhibitor = {
        company_name: exhibitor.company_name || '',
        website_url: exhibitor.website_url,
        booth_number: exhibitor.booth_number,
        primary_contact: exhibitor.primary_contact,
        contact_title: exhibitor.contact_title,
        email_address: exhibitor.email_address,
        address_1: exhibitor.address_1,
        address_2: exhibitor.address_2,
        city: exhibitor.city,
        state: exhibitor.state,
        zip: exhibitor.zip,
        phone: exhibitor.phone,
        industry_category: exhibitor.industry_category,
        company_bio: exhibitor.company_bio
      };

      // Debug first few records
      if (i <= 3) {
        console.log(`Record ${i} raw exhibitor:`, exhibitor);
        console.log(`Record ${i} mapped:`, mappedExhibitor);
        console.log('---');
      }

      // Only add if we have at least a company name
      if (mappedExhibitor.company_name) {
        exhibitors.push(mappedExhibitor);
      }
    }

    return exhibitors;
  }
}

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = 'text-embedding-ada-002';
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateEmbeddings(texts) {
    try {
      const batchSize = 100;
      const embeddings = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        embeddings.push(...response.data.map(item => item.embedding));
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
}

class ExhibitorImporter {
  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.csvParser = new CSVParser();
    this.embeddingService = new EmbeddingService();
  }

  prepareTextForEmbedding(exhibitor) {
    const parts = [
      exhibitor.company_name,
      exhibitor.industry_category,
      exhibitor.company_bio,
      exhibitor.booth_number ? `Booth ${exhibitor.booth_number}` : '',
      exhibitor.contact_title,
      exhibitor.city,
      exhibitor.state
    ].filter(Boolean);

    return parts.join(' ');
  }

  async importFromCSV(filePath, options = {}) {
    const { batchSize = 10, skipExisting = false } = options;

    console.log('Parsing CSV file...');
    const exhibitors = await this.csvParser.parseFile(filePath);
    console.log(`Found ${exhibitors.length} exhibitors in CSV`);

    if (skipExisting) {
      const { data: existing } = await this.supabase
        .from('exhibitors')
        .select('company_name')
        .in('company_name', exhibitors.map(e => e.company_name));

      const existingNames = new Set(existing?.map(e => e.company_name) || []);
      const newExhibitors = exhibitors.filter(e => !existingNames.has(e.company_name));
      
      console.log(`Skipping ${existingNames.size} existing exhibitors`);
      console.log(`Processing ${newExhibitors.length} new exhibitors`);
      
      return this.processExhibitors(newExhibitors, batchSize);
    }

    return this.processExhibitors(exhibitors, batchSize);
  }

  async processExhibitors(exhibitors, batchSize) {
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < exhibitors.length; i += batchSize) {
      const batch = exhibitors.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(exhibitors.length / batchSize)}`);

      try {
        const texts = batch.map(e => this.prepareTextForEmbedding(e));
        const embeddings = await this.embeddingService.generateEmbeddings(texts);

        const exhibitorsWithEmbeddings = batch.map((exhibitor, index) => ({
          ...exhibitor,
          embedding: embeddings[index]
        }));

        const { data, error } = await this.supabase
          .from('exhibitors')
          .insert(exhibitorsWithEmbeddings)
          .select();

        if (error) {
          console.error('Database error:', error);
          errorCount += batch.length;
        } else {
          successCount += data.length;
          console.log(`Successfully inserted ${data.length} exhibitors`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('Batch processing error:', error);
        errorCount += batch.length;
      }
    }

    console.log('\nImport completed!');
    console.log(`Successfully imported: ${successCount} exhibitors`);
    console.log(`Errors: ${errorCount} exhibitors`);

    return { successCount, errorCount };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/import-exhibitors.js <csv-file-path> [--skip-existing]');
    process.exit(1);
  }

  const filePath = args[0];
  const skipExisting = args.includes('--skip-existing');

  const importer = new ExhibitorImporter();
  
  importer.importFromCSV(filePath, { skipExisting })
    .then(() => {
      console.log('Import process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { ExhibitorImporter };