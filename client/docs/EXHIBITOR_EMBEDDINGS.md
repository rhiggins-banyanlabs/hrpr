# Exhibitor Embeddings System

This system allows you to import exhibitor data from CSV files and create vector embeddings for semantic search capabilities.

## Setup

### 1. Enable pgvector in Supabase

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL script: `scripts/create-exhibitor-embeddings-table-v2.sql`

This will:
- Enable the pgvector extension
- Create the exhibitors table with vector support
- Create indexes for efficient search
- Create a search function

### 2. Prepare Your CSV File

Your CSV file should have these exact column headers:
- Company Name (required)
- Website URL
- Booth Number
- Primary Contact
- Contact Title
- Email Address
- Address 1
- Address 2
- City
- State
- Zip
- Phone
- Industry Category
- Company Bio

Example CSV format:
```csv
Company Name,Website URL,Booth Number,Primary Contact,Contact Title,Email Address,Address 1,Address 2,City,State,Zip,Phone,Industry Category,Company Bio
"Acme Corporation","www.acme.com","101","John Smith","VP Sales","john@acme.com","123 Main St","Suite 200","Dallas","TX","75201","555-123-4567","Technology","Leading provider of innovative tech solutions"
"Tech Solutions Inc","www.techsolutions.com","102","Jane Doe","Director","jane@techsolutions.com","456 Oak Ave","","Austin","TX","78701","555-987-6543","IT Services","Enterprise IT consulting and services"
```

### 3. Import Exhibitors

Run the import script:

```bash
# Install dependencies if needed
npm install

# Import all exhibitors
npx ts-node scripts/import-exhibitors.ts /path/to/your/exhibitors.csv

# Import only new exhibitors (skip existing ones)
npx ts-node scripts/import-exhibitors.ts /path/to/your/exhibitors.csv --skip-existing
```

The script will:
- Parse the CSV file
- Generate embeddings for each exhibitor using OpenAI
- Store the data in Supabase with vector embeddings
- Process in batches to avoid rate limits

## Using the Search API

### Semantic Search (Vector-based)

```typescript
// Search by meaning/context
const response = await fetch('/api/exhibitors/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'security software solutions',
    limit: 10
  })
});

const data = await response.json();
// Returns exhibitors ranked by semantic similarity
```

### Traditional Search

```typescript
// Search by exact booth number or company name
const response = await fetch('/api/exhibitors/search?booth=101&company=Acme');
const data = await response.json();
```

## Using the React Hook

```typescript
import { useExhibitorSearch } from '@/hooks/useExhibitorSearch';

function ExhibitorSearch() {
  const { searchExhibitors, results, isSearching, error } = useExhibitorSearch();

  const handleSearch = async (query: string) => {
    await searchExhibitors(query, 10);
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isSearching && <p>Searching...</p>}
      {results.map(exhibitor => (
        <div key={exhibitor.id}>
          <h3>{exhibitor.company_name}</h3>
          <p>Booth: {exhibitor.booth_number}</p>
          <p>Match: {(exhibitor.similarity * 100).toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}
```

## How It Works

1. **Text Preparation**: Combines company name, industry category, company bio, booth number, contact title, city, and state
2. **Embedding Generation**: Uses OpenAI's text-embedding-ada-002 model (1536 dimensions)
3. **Storage**: Stores embeddings as vectors in PostgreSQL using pgvector
4. **Search**: Uses cosine similarity to find semantically similar exhibitors
5. **Ranking**: Returns results sorted by similarity score

## Best Practices

1. **Batch Processing**: The import script processes exhibitors in batches to avoid rate limits
2. **Meaningful Descriptions**: Include detailed descriptions and product/service information for better search results
3. **Regular Updates**: Re-import periodically to update exhibitor information
4. **Search Queries**: Use natural language queries like "companies offering cybersecurity solutions" rather than keywords

## Troubleshooting

### Common Issues

1. **Rate Limits**: If you hit OpenAI rate limits, reduce the batch size in the import script
2. **Missing Embeddings**: Check that all required environment variables are set
3. **Search Not Working**: Ensure pgvector extension is enabled and indexes are created
4. **CSV Parsing Errors**: Ensure CSV is properly formatted with quoted fields containing commas

### Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```