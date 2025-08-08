import { useState, useCallback } from 'react';
import axios from 'axios';

export interface ExhibitorSearchResult {
  id: string;
  company_name: string;
  website_url?: string;
  booth_number?: string;
  primary_contact?: string;
  contact_title?: string;
  email_address?: string;
  phone?: string;
  industry_category?: string;
  company_bio?: string;
  city?: string;
  state?: string;
  similarity: number;
}

export interface ExhibitorSearchResponse {
  results: ExhibitorSearchResult[];
  query: string;
  count: number;
}

export function useExhibitorSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExhibitorSearchResult[]>([]);

  const searchExhibitors = useCallback(async (query: string, limit: number = 10) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await axios.post<ExhibitorSearchResponse>(
        '/api/exhibitors/search',
        { query, limit }
      );

      setResults(response.data.results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search exhibitors');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    searchExhibitors,
    results,
    isSearching,
    error,
    clearResults
  };
}