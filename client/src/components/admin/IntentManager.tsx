'use client';

import { useState, useEffect } from 'react';
import { semanticRouterSupabase } from '@/services/semantic-router-supabase.service';
import { embeddingService } from '@/services/embedding.service';

interface IntentExample {
  id: string;
  intent: string;
  example_text: string;
  created_at: string;
}

export function IntentManager() {
  const [intents, setIntents] = useState<string[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  const [newIntent, setNewIntent] = useState('');
  const [newExample, setNewExample] = useState('');
  const [examples, setExamples] = useState<IntentExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Available intent types
  const intentTypes = [
    'venue',
    'conference', 
    'location',
    'exhibitor',
    'workshop',
    'meeting',
    'info',
    'general'
  ];

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
      const availableIntents = await semanticRouterSupabase.getAvailableIntents();
      setIntents(availableIntents);
      if (availableIntents.length > 0 && !selectedIntent) {
        setSelectedIntent(availableIntents[0]);
      }
    } catch (error) {
      console.error('Error loading intents:', error);
    }
  };

  const loadExamples = async (intent: string) => {
    try {
      const intentExamples = await semanticRouterSupabase.getIntentExamples(intent);
      // Map IntentEmbedding to IntentExample format, handling the type difference
      const mappedExamples: IntentExample[] = intentExamples.map((item: any) => ({
        id: item.id,
        intent: item.intent,
        example_text: item.example_text,
        created_at: item.created_at || new Date().toISOString() // Use created_at if available, otherwise current date
      }));
      setExamples(mappedExamples);
    } catch (error) {
      console.error('Error loading examples:', error);
    }
  };

  const handleAddExample = async () => {
    if (!newExample.trim()) {
      setMessage({ type: 'error', text: 'Please enter an example text' });
      return;
    }

    const intentToUse = newIntent || selectedIntent;
    if (!intentToUse) {
      setMessage({ type: 'error', text: 'Please select or enter an intent' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Generate embedding for the example
      const embedding = await embeddingService.generateEmbedding(newExample);
      
      // Add to database
      const success = await semanticRouterSupabase.addIntentExample(
        intentToUse,
        newExample,
        embedding
      );

      if (success) {
        setMessage({ type: 'success', text: 'Example added successfully!' });
        setNewExample('');
        setNewIntent('');
        
        // Reload data
        await loadIntents();
        if (intentToUse === selectedIntent) {
          await loadExamples(intentToUse);
        } else {
          setSelectedIntent(intentToUse);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to add example' });
      }
    } catch (error) {
      console.error('Error adding example:', error);
      setMessage({ type: 'error', text: 'Error generating embedding' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm('Are you sure you want to delete this example?')) return;

    try {
      const success = await semanticRouterSupabase.deleteIntentExample(id);
      if (success) {
        setMessage({ type: 'success', text: 'Example deleted' });
        await loadExamples(selectedIntent);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete example' });
      }
    } catch (error) {
      console.error('Error deleting example:', error);
      setMessage({ type: 'error', text: 'Error deleting example' });
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-xl font-bold text-green-400 mb-4">Intent Training Manager</h2>
      
      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add New Example */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold text-green-300 mb-3">Add New Training Example</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Intent Type</label>
            <div className="flex gap-2">
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                className="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded"
              >
                <option value="">Select existing intent...</option>
                {intents.map(intent => (
                  <option key={intent} value={intent}>{intent}</option>
                ))}
              </select>
              <input
                type="text"
                value={newIntent}
                onChange={(e) => setNewIntent(e.target.value)}
                placeholder="Or create new..."
                className="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded"
                list="intent-suggestions"
              />
              <datalist id="intent-suggestions">
                {intentTypes.map(type => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Example Query</label>
            <input
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="e.g., 'Where can I find coffee?'"
              className="w-full bg-gray-700 text-gray-100 px-3 py-2 rounded"
              onKeyPress={(e) => e.key === 'Enter' && handleAddExample()}
            />
          </div>

          <button
            onClick={handleAddExample}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium ${
              isLoading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLoading ? 'Adding...' : 'Add Example'}
          </button>
        </div>
      </div>

      {/* View Existing Examples */}
      <div className="p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold text-green-300 mb-3">
          Existing Examples {selectedIntent && `for "${selectedIntent}"`}
        </h3>
        
        <div className="max-h-96 overflow-y-auto space-y-2">
          {examples.length === 0 ? (
            <p className="text-gray-500">No examples found</p>
          ) : (
            examples.map((example) => (
              <div
                key={example.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-gray-200">{example.example_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Added: {new Date(example.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteExample(example.id)}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-4 p-3 bg-gray-800 rounded">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-400">{intents.length}</p>
            <p className="text-xs text-gray-500">Intent Types</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{examples.length}</p>
            <p className="text-xs text-gray-500">Examples in {selectedIntent}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {intents.reduce((sum, intent) => sum + (intent === selectedIntent ? examples.length : 0), 0)}
            </p>
            <p className="text-xs text-gray-500">Total Loaded</p>
          </div>
        </div>
      </div>
    </div>
  );
}