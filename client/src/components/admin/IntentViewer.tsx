'use client';

import { useState, useEffect } from 'react';
import { Brain, Copy, Check, Search, Filter, RefreshCw } from 'lucide-react';
import { semanticRouterSupabase } from '@/services/semantic-router-supabase.service';

interface IntentExample {
  id: string;
  intent: string;
  example_text: string;
  created_at?: string;
}

export function IntentViewer() {
  const [intents, setIntents] = useState<string[]>([]);
  const [examples, setExamples] = useState<IntentExample[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntents();
  }, []);

  useEffect(() => {
    if (selectedIntent) {
      loadExamples(selectedIntent);
    }
  }, [selectedIntent]);

  const loadIntents = async () => {
    try {
      setIsLoading(true);
      // Load intents from Supabase
      const availableIntents = await semanticRouterSupabase.getAvailableIntents();
      setIntents(availableIntents);
      
      // Set first intent as selected
      if (availableIntents.length > 0 && !selectedIntent) {
        setSelectedIntent(availableIntents[0]);
      }
    } catch (err) {
      console.error('Error loading intents:', err);
      setError('Failed to load intent data from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExamples = async (intent: string) => {
    try {
      const intentExamples = await semanticRouterSupabase.getIntentExamples(intent);
      // Map to IntentExample format
      const mappedExamples: IntentExample[] = intentExamples.map((item: any) => ({
        id: item.id,
        intent: item.intent,
        example_text: item.example_text,
        created_at: item.created_at
      }));
      setExamples(mappedExamples);
    } catch (error) {
      console.error('Error loading examples:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };


  const filteredExamples = examples.filter(example => 
    example.example_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalIntents: intents.length,
    totalExamples: examples.length, // This will show total for current intent
    currentIntentExamples: filteredExamples.length
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="bg-red-800/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm mb-2">To fix this, copy intent-embeddings.min.json to public folder:</p>
            <code className="text-green-400 text-xs">cp src/data/intent-embeddings.min.json public/</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-6 w-6 text-green-400" />
        <h2 className="text-xl font-bold text-green-400">Intent Training Viewer</h2>
        <span className="text-gray-500 text-sm">(Read-Only)</span>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.totalIntents}</p>
          <p className="text-xs text-gray-500">Intent Types</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.totalExamples}</p>
          <p className="text-xs text-gray-500">Total Examples</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.currentIntentExamples}</p>
          <p className="text-xs text-gray-500">In {selectedIntent}</p>
        </div>
      </div>

      {/* Intent Selector */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Select Intent Type</label>
        <div className="grid grid-cols-4 gap-2">
          {intents.map(intent => (
            <button
              key={intent}
              onClick={() => setSelectedIntent(intent)}
              className={`px-3 py-2 rounded transition-colors ${
                selectedIntent === intent
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {intent}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search examples..."
            className="w-full bg-gray-800 text-gray-100 pl-10 pr-4 py-2 rounded"
          />
        </div>
      </div>

      {/* Examples List */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-green-300">
            Examples for "{selectedIntent}"
          </h3>
          <span className="text-gray-500 text-sm">
            {filteredExamples.length} of {stats.currentIntentExamples} shown
          </span>
        </div>
        
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredExamples.length === 0 ? (
            <p className="text-gray-500">No examples found</p>
          ) : (
            filteredExamples.map((example) => (
              <div
                key={example.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors group"
              >
                <div className="flex-1">
                  <p className="text-gray-200">{example.example_text}</p>
                  {example.created_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Added: {new Date(example.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(example.example_text, `example-${example.id}`)}
                  className="ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy example"
                >
                  {copiedText === `example-${example.id}` ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-400 font-semibold mb-3">Intent Training Information</h3>
        
        <div className="space-y-3">
          <div>
            <p className="text-gray-300 text-sm">
              This viewer shows intent examples stored in Supabase. To add new examples, use the Intent Manager tab
              or the admin interface. The system uses semantic similarity search with OpenAI embeddings.
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                loadIntents();
                if (selectedIntent) loadExamples(selectedIntent);
              }}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}