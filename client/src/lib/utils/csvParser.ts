import { promises as fs } from 'fs';

export interface ExhibitorData {
  company_name: string;
  website_url?: string;
  booth_number?: string;
  primary_contact?: string;
  contact_title?: string;
  email_address?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  industry_category?: string;
  company_bio?: string;
}

export class CSVParser {
  private delimiter: string;

  constructor(delimiter: string = ',') {
    this.delimiter = delimiter;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
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

  private normalizeHeaders(headers: string[]): string[] {
    return headers.map(header => 
      header
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );
  }

  async parseFile(filePath: string): Promise<ExhibitorData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content);
  }

  parseContent(content: string): ExhibitorData[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headerLine = lines[0];
    const headers = this.normalizeHeaders(this.parseCSVLine(headerLine));
    
    const exhibitors: ExhibitorData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const exhibitor: any = {};

      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          exhibitor[header] = values[index];
        }
      });

      // Map your specific CSV columns to our standard fields
      const mappedExhibitor: ExhibitorData = {
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

      // Only add if we have at least a company name
      if (mappedExhibitor.company_name) {
        exhibitors.push(mappedExhibitor);
      }
    }

    return exhibitors;
  }
}