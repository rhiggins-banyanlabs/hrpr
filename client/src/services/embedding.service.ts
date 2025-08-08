import OpenAI from 'openai';

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private model = 'text-embedding-ada-002'; // OpenAI's embedding model

  constructor() {
    // Only initialize OpenAI client on server side
    if (typeof window === 'undefined' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Server-side: use OpenAI directly
      if (typeof window === 'undefined' && this.openai) {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: text,
        });
        return response.data[0].embedding;
      }
      
      // Client-side: use API endpoint
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embedding via API');
      }

      const data = await response.json();
      return data.embedding;
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      // For client-side, generate one at a time
      if (typeof window !== 'undefined' || !this.openai) {
        for (const text of texts) {
          const embedding = await this.generateEmbedding(text);
          embeddings.push(embedding);
        }
        return embeddings;
      }
      
      // Server-side: batch processing
      const batchSize = 100; // Conservative batch size
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

  // Helper method to calculate cosine similarity between two embeddings
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

export const embeddingService = new EmbeddingService();